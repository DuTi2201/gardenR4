const mongoose = require('mongoose');
const axios = require('axios');
const Garden = require('../models/Garden');
const SensorData = require('../models/SensorData');
const Image = require('../models/Image');
const Log = require('../models/Log');
const Notification = require('../models/Notification');
const Schedule = require('../models/Schedule');

/**
 * @desc    Phân tích dữ liệu vườn với Gemini API
 * @route   POST /api/gardens/:id/analyze
 * @access  Private
 */
exports.analyzeGarden = async (req, res, next) => {
  try {
    // Kiểm tra xem req.user có tồn tại không
    if (!req.user || !req.user._id) {
      console.error('Không có thông tin người dùng trong request');
      return res.status(401).json({
        success: false,
        message: 'Không có thông tin người dùng, vui lòng đăng nhập lại'
      });
    }

    console.log(`[Analysis] Bắt đầu phân tích vườn ID: ${req.params.id} cho user: ${req.user._id}`);
    
    // Kiểm tra garden ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'ID vườn không hợp lệ'
      });
    }
    
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn với ID này'
      });
    }
    
    // Log cấu trúc garden để debug
    console.log('Garden structure:', {
      id: garden._id,
      name: garden.name,
      hasDevicesProperty: garden.hasOwnProperty('devices'),
      devicesIsArray: garden.devices && Array.isArray(garden.devices),
      devicesCount: garden.devices && Array.isArray(garden.devices) ? garden.devices.length : 0,
      has_camera: garden.has_camera
    });
    
    // Kiểm tra xem người dùng có quyền truy cập vườn này không
    if (!garden.user_id || garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập vườn này'
      });
    }
    
    // Lấy dữ liệu cảm biến mới nhất
    const latestSensorData = await SensorData.findOne({ garden_id: garden._id })
      .sort({ timestamp: -1 });
    
    if (!latestSensorData) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có dữ liệu cảm biến nào cho vườn này'
      });
    }
    
    // Lấy lịch sử dữ liệu cảm biến trong 7 ngày qua
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let historicalData = [];
    try {
      historicalData = await SensorData.find({
        garden_id: garden._id,
        timestamp: { $gte: sevenDaysAgo }
      }).sort({ timestamp: 1 });
    } catch (historyError) {
      console.error('Lỗi khi lấy dữ liệu lịch sử:', historyError);
      // Tiếp tục với mảng rỗng nếu có lỗi
    }
    
    // Lấy thông tin thiết bị camera - thêm kiểm tra an toàn
    let cameraDevice = null;
    try {
      // Kiểm tra dữ liệu devices một cách toàn diện
      if (garden && garden.devices) {
        // Kiểm tra xem devices có phải là mảng không
        if (Array.isArray(garden.devices)) {
          // Chỉ tìm kiếm nếu mảng không rỗng
          if (garden.devices.length > 0) {
            // Tìm kiếm camera device một cách an toàn
            garden.devices.forEach(device => {
              if (device && typeof device === 'object' && device.type === 'camera') {
                cameraDevice = device;
              }
            });
            console.log('Camera device found:', cameraDevice ? cameraDevice.device_id : 'None');
          } else {
            console.log('Garden devices array is empty');
          }
        } else {
          console.log('Garden devices is not an array:', typeof garden.devices);
        }
      } else {
        console.log('Garden has no devices property');
      }
    } catch (deviceError) {
      console.error('Error processing camera device:', deviceError);
    }
    
    // Nếu vườn có camera, yêu cầu chụp ảnh mới qua MQTT trước khi phân tích
    let latestImage = null;
    if (garden.has_camera === true && cameraDevice) {
      // Ghi log bắt đầu chụp ảnh
      try {
        await Log.create({
          garden_id: garden._id,
          level: 'INFO',
          message: 'Yêu cầu chụp ảnh mới cho phân tích',
          source: 'SERVER'
        });
      } catch (logError) {
        console.error('Lỗi khi tạo log:', logError);
      }
      
      console.log(`Yêu cầu chụp ảnh mới từ camera: ${cameraDevice.device_id}`);
      
      try {
        // Gửi yêu cầu chụp ảnh qua MQTT (sử dụng một service hoặc import)
        const mqttService = require('../services/mqttService');
        
        try {
          // Gửi lệnh chụp ảnh qua MQTT service
          await mqttService.takePhoto(cameraDevice.device_id);
          
          // Chờ một khoảng thời gian cho camera chụp và lưu ảnh (khoảng 5 giây)
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            // Tìm ảnh mới nhất sau khi chụp
            latestImage = await Image.findOne({ 
              garden_id: garden._id,
              timestamp: { $gte: new Date(Date.now() - 10000) } // Lấy ảnh trong 10 giây gần nhất
            }).sort({ timestamp: -1 });
            
            if (latestImage) {
              console.log(`Đã tìm thấy ảnh mới nhất: ${latestImage._id}`);
            } else {
              // Nếu không tìm thấy ảnh mới, lấy ảnh gần nhất
              try {
                latestImage = await Image.findOne({ garden_id: garden._id })
                  .sort({ timestamp: -1 });
                
                console.log(`Không tìm thấy ảnh mới, sử dụng ảnh gần nhất: ${latestImage ? latestImage._id : 'Không có ảnh'}`);
              } catch (imgError) {
                console.error('Lỗi khi tìm ảnh gần nhất:', imgError);
              }
            }
          } catch (imgError) {
            console.error('Lỗi khi tìm ảnh mới:', imgError);
          }
        } catch (error) {
          console.error('Lỗi khi chụp ảnh mới:', error);
          
          // Nếu có lỗi, lấy ảnh gần nhất
          try {
            latestImage = await Image.findOne({ garden_id: garden._id })
              .sort({ timestamp: -1 });
          } catch (imgError) {
            console.error('Lỗi khi tìm ảnh gần nhất:', imgError);
          }
        }
      } catch (error) {
        console.error('Lỗi khi chụp ảnh mới:', error);
        
        // Nếu có lỗi, lấy ảnh gần nhất
        try {
          latestImage = await Image.findOne({ garden_id: garden._id })
            .sort({ timestamp: -1 });
        } catch (imgError) {
          console.error('Lỗi khi tìm ảnh gần nhất:', imgError);
        }
      }
    } else if (garden.has_camera === true) {
      console.log('Garden has camera but no camera device found, getting latest image');
      // Nếu có camera nhưng không có thông tin thiết bị, lấy ảnh gần nhất
      try {
        latestImage = await Image.findOne({ garden_id: garden._id })
          .sort({ timestamp: -1 });
        console.log('Latest image found:', latestImage ? latestImage._id : 'None');
      } catch (imgError) {
        console.error('Error finding latest image:', imgError);
      }
    }
    
    // Đảm bảo có thông tin thresholds
    const thresholds = {
      temperature: {
        low: garden.settings && garden.settings.temperature_threshold_low !== undefined ? garden.settings.temperature_threshold_low : 15,
        high: garden.settings && garden.settings.temperature_threshold_high !== undefined ? garden.settings.temperature_threshold_high : 30
      },
      humidity: {
        low: garden.settings && garden.settings.humidity_threshold_low !== undefined ? garden.settings.humidity_threshold_low : 30,
        high: garden.settings && garden.settings.humidity_threshold_high !== undefined ? garden.settings.humidity_threshold_high : 70
      },
      light: {
        low: garden.settings && garden.settings.light_threshold_low !== undefined ? garden.settings.light_threshold_low : 20,
        high: garden.settings && garden.settings.light_threshold_high !== undefined ? garden.settings.light_threshold_high : 80
      },
      soil: {
        low: garden.settings && garden.settings.soil_threshold_low !== undefined ? garden.settings.soil_threshold_low : 20,
        high: garden.settings && garden.settings.soil_threshold_high !== undefined ? garden.settings.soil_threshold_high : 70
      }
    };
    
    // Chuẩn bị dữ liệu để gửi đến Gemini API
    const analysisData = {
      gardenInfo: {
        name: garden.name || 'Vườn không tên',
        description: garden.description || 'Không có mô tả'
      },
      currentData: {
        temperature: latestSensorData.temperature,
        humidity: latestSensorData.humidity,
        light: latestSensorData.light,
        soil: latestSensorData.soil,
        timestamp: latestSensorData.timestamp
      },
      historicalData: historicalData.map(data => ({
        temperature: data.temperature,
        humidity: data.humidity,
        light: data.light,
        soil: data.soil,
        timestamp: data.timestamp
      })),
      imageUrl: latestImage ? latestImage.url : null,
      imageData: latestImage ? {
        timestamp: latestImage.timestamp,
        url: latestImage.url
      } : null,
      thresholds: thresholds
    };
    
    // Ghi log bắt đầu phân tích
    try {
      await Log.create({
        garden_id: garden._id,
        level: 'INFO',
        message: 'Bắt đầu phân tích dữ liệu vườn với Gemini API',
        source: 'SERVER'
      });
    } catch (logError) {
      console.error('Lỗi khi tạo log bắt đầu phân tích:', logError);
    }
    
    // Gọi Gemini API để phân tích dữ liệu
    try {
      console.log('Calling Gemini API with garden data...');
      
      // Chuẩn bị prompt cho Gemini
      const prompt = `
      Hãy phân tích dữ liệu vườn thông minh sau đây và đưa ra các đề xuất chăm sóc cây trồng:
      
      Thông tin vườn: 
      - Tên: ${analysisData.gardenInfo.name}
      - Mô tả: ${analysisData.gardenInfo.description}
      
      Dữ liệu cảm biến hiện tại:
      - Nhiệt độ: ${analysisData.currentData.temperature}°C
      - Độ ẩm không khí: ${analysisData.currentData.humidity}%
      - Ánh sáng: ${analysisData.currentData.light}%
      - Độ ẩm đất: ${analysisData.currentData.soil}%
      
      Ngưỡng cảm biến:
      - Nhiệt độ: ${analysisData.thresholds.temperature.low}°C - ${analysisData.thresholds.temperature.high}°C
      - Độ ẩm không khí: ${analysisData.thresholds.humidity.low}% - ${analysisData.thresholds.humidity.high}%
      - Ánh sáng: ${analysisData.thresholds.light.low}% - ${analysisData.thresholds.light.high}%
      - Độ ẩm đất: ${analysisData.thresholds.soil.low}% - ${analysisData.thresholds.soil.high}%
      
      ${latestImage ? `
      Hình ảnh vườn:
      - URL: ${latestImage.url}
      - Thời gian chụp: ${new Date(latestImage.timestamp).toLocaleString('vi-VN')}
      
      Dựa trên hình ảnh, hãy phân tích tình trạng cây trồng:
      1. Nhận diện các vấn đề có thể thấy qua hình ảnh (nếu có) như: lá vàng, lá khô, có dấu hiệu sâu bệnh, etc.
      2. Đánh giá sự phát triển của cây qua hình ảnh: cây cao, cây thấp, cây phát triển tốt hay chậm.
      3. Xác định các dấu hiệu thiếu chất dinh dưỡng nếu có thể thấy qua hình ảnh.
      4. Phát hiện sâu bệnh nếu có dấu hiệu trong hình ảnh (mô tả chi tiết vị trí, đặc điểm).
      5. Nhận xét về màu sắc lá, cành, hoa, quả (nếu có).
      ` : ''}
      
      Thông tin thiết bị điều khiển có sẵn:
      - Quạt (FAN): Điều chỉnh nhiệt độ và độ ẩm không khí
      - Đèn (LIGHT): Điều chỉnh ánh sáng
      - Bơm nước (PUMP): Điều chỉnh độ ẩm đất
      - Bơm dinh dưỡng (PUMP2): Bổ sung dinh dưỡng cho cây
      
      Dựa trên dữ liệu cảm biến ${latestImage ? 'và hình ảnh' : ''} trên, hãy phân tích:
      1. Tình trạng sức khỏe hiện tại của vườn (health_status)
      2. Đánh giá điều kiện môi trường (environment_assessment)
      3. Đưa ra dự báo trong thời gian tới (forecast)
      4. Các điểm cần chú ý (attention_points)
      5. Tóm tắt tổng quan (summary)
      6. Các đề xuất cụ thể để cải thiện (recommendations) dưới dạng văn bản
      7. Đánh giá điểm tổng thể từ 0-100 (overallScore)
      
      Ngoài ra, hãy đưa ra các đề xuất cụ thể về lịch trình điều khiển thiết bị (device_recommendations). Mỗi thiết bị cần có CẢ lịch trình BẬT và TẮT để tạo thành một chu kỳ hoàn chỉnh. Mỗi đề xuất bao gồm:
      - Thiết bị cần điều khiển (device): FAN, LIGHT, PUMP, PUMP2
      - Hành động (action): true (BẬT) hoặc false (TẮT)
      - Thời gian thực hiện (time): định dạng "HH:MM" (ví dụ: "08:00")
      - Các ngày trong tuần (days): mảng các ngày ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      
      Lưu ý quan trọng: Đối với mỗi thiết bị sử dụng, HÃY LUÔN tạo CẢ hai đề xuất - một để BẬT và một để TẮT thiết bị sau khoảng thời gian phù hợp. Ví dụ, nếu bạn đề xuất bật máy bơm lúc 6:00 sáng, hãy đề xuất thêm tắt máy bơm vào thời điểm thích hợp (như 6:30 sáng). Điều này giúp hệ thống hoàn toàn tự động mà không cần sự can thiệp của người dùng.
      
      Trả về kết quả dưới dạng JSON với cấu trúc như sau:
      {
        "health_status": "string",
        "environment_assessment": "string",
        "forecast": "string",
        "attention_points": "string",
        "summary": "string",
        "recommendations": ["string", "string", ...],
        "image_analysis": {
          "issues_detected": ["string", ...],
          "growth_assessment": "string",
          "nutrient_deficiencies": ["string", ...],
          "pests_diseases": ["string", ...],
          "color_assessment": "string"
        },
        "device_recommendations": [
          {
            "device": "string", 
            "action": boolean,
            "time": "string", 
            "days": ["string", ...],
            "description": "string" // Mô tả ngắn về lý do đề xuất
          },
          ...
        ],
        "overallScore": number
      }
      `;
      
      // Kiểm tra API key
      if (!process.env.GEMINI_API_KEY) {
        console.error('Thiếu Gemini API key trong biến môi trường');
        throw new Error('Thiếu cấu hình Gemini API key');
      }
      
      console.log('Gọi Gemini API với Gemini API Key:', process.env.GEMINI_API_KEY ? 'API Key tồn tại (không hiện chi tiết vì bảo mật)' : 'API Key không tồn tại');
      
      try {
        // Sử dụng model Gemini 2.0 Flash
        const response = await axios.post(
          'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent',
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY
            }
          }
        );
        
        console.log('Gemini API response received with status:', response.status);
        console.log('Gemini API response data structure:', Object.keys(response.data));
        
        // Xử lý kết quả từ Gemini
        let analysisResult;
        
        try {
          // Trích xuất phần text từ phản hồi
          if (!response.data || !response.data.candidates || !response.data.candidates[0] || 
              !response.data.candidates[0].content || !response.data.candidates[0].content.parts || 
              !response.data.candidates[0].content.parts[0] || !response.data.candidates[0].content.parts[0].text) {
            throw new Error('Cấu trúc phản hồi từ Gemini không đúng định dạng');
          }
          
          const responseText = response.data.candidates[0].content.parts[0].text;
          console.log('Gemini response text received, length:', responseText.length);
          
          // Tìm phần JSON trong văn bản, xử lý cả trường hợp bọc trong ```json và không
          let jsonText = responseText;
          
          // Trường hợp 1: JSON được bọc trong ```json ... ```
          const codeBlockMatch = responseText.match(/```(?:json)?([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            jsonText = codeBlockMatch[1].trim();
            console.log('Found JSON in code block format');
          } 
          // Trường hợp 2: JSON không được bọc, tìm cấu trúc { ... }
          else {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonText = jsonMatch[0];
              console.log('Found JSON in plain format');
            }
          }
          
          try {
            // Parse phần JSON
            analysisResult = JSON.parse(jsonText);
            console.log('Successfully parsed JSON from Gemini response');
            
            // Thêm trường mặc định nếu thiếu
            if (!analysisResult.image_analysis && latestImage) {
              analysisResult.image_analysis = {
                issues_detected: [],
                growth_assessment: "Không có thông tin phân tích hình ảnh",
                nutrient_deficiencies: [],
                pests_diseases: [],
                color_assessment: "Không có thông tin phân tích màu sắc"
              };
            }
            
            if (!analysisResult.device_recommendations) {
              analysisResult.device_recommendations = [];
            }
            
            if (!analysisResult.recommendations) {
              analysisResult.recommendations = [];
            }
            
            if (!analysisResult.overallScore) {
              // Tính điểm tổng thể dựa trên health_status nếu có thể
              const healthStatus = analysisResult.health_status || '';
              let score = 50; // Điểm mặc định
              
              if (healthStatus.toLowerCase().includes('tốt') || healthStatus.toLowerCase().includes('good')) {
                score = 75;
              } else if (healthStatus.toLowerCase().includes('kém') || healthStatus.toLowerCase().includes('poor')) {
                score = 25;
              }
              
              analysisResult.overallScore = score;
            }
            
          } catch (jsonError) {
            console.error('Lỗi khi parse JSON:', jsonError);
            console.error('JSON text attempted to parse:', jsonText);
            throw new Error('Không thể phân tích JSON từ phản hồi Gemini');
          }
        } catch (parseError) {
          console.error('Lỗi khi phân tích phản hồi từ Gemini:', parseError);
          
          // Tạo kết quả mặc định nếu không thể phân tích được JSON
          analysisResult = {
            health_status: "Không thể xác định do lỗi phân tích dữ liệu",
            environment_assessment: "Không thể phân tích do lỗi xử lý phản hồi",
            forecast: "Không có dữ liệu",
            attention_points: "Không có dữ liệu",
            summary: "Không thể phân tích dữ liệu vườn do lỗi xử lý phản hồi từ AI",
            recommendations: ["Vui lòng thử phân tích lại sau"],
            image_analysis: latestImage ? {
              issues_detected: ["Không thể phân tích"],
              growth_assessment: "Không thể phân tích",
              nutrient_deficiencies: ["Không thể phân tích"],
              pests_diseases: ["Không thể phân tích"],
              color_assessment: "Không thể phân tích"
            } : null,
            device_recommendations: [],
            overallScore: 0
          };
        }
        
        // Lưu kết quả phân tích vào Image (nếu có)
        if (latestImage) {
          try {
            latestImage.analysis = {
              status: 'completed',
              result: analysisResult,
              timestamp: new Date()
            };
            await latestImage.save();
          } catch (saveError) {
            console.error('Lỗi khi lưu kết quả phân tích vào ảnh:', saveError);
          }
        }
        
        // Tạo thông báo cho người dùng về kết quả phân tích
        try {
          await Notification.create({
            user_id: garden.user_id,
            garden_id: garden._id,
            title: 'Phân tích vườn hoàn tất',
            message: `Phân tích cho vườn ${garden.name} đã hoàn tất. Điểm sức khỏe tổng thể: ${analysisResult.overallScore}/100`,
            type: 'ANALYSIS',
            action_url: `/gardens/${garden._id}/analysis`,
            read: false
          });
        } catch (notifError) {
          console.error('Lỗi khi tạo thông báo:', notifError);
        }
        
        // Kiểm tra Garden model đã có mảng analysis_history chưa
        if (!garden.analysis_history) {
          garden.analysis_history = [];
        }
        
        // Tạo bản ghi phân tích mới và thêm vào history
        const analysisRecord = {
          timestamp: new Date(),
          result: analysisResult,
          image: latestImage ? {
            url: latestImage.url,
            timestamp: latestImage.timestamp
          } : null,
          sensor_data: {
            temperature: latestSensorData.temperature,
            humidity: latestSensorData.humidity,
            soil: latestSensorData.soil,
            light: latestSensorData.light,
            timestamp: latestSensorData.timestamp
          }
        };
        
        garden.analysis_history.push(analysisRecord);
        
        // Giữ tối đa 10 bản ghi phân tích gần nhất
        if (garden.analysis_history.length > 10) {
          garden.analysis_history = garden.analysis_history.slice(-10);
        }
        
        // Lưu garden với history mới
        await garden.save();
        
        // Ghi log kết thúc phân tích
        try {
          await Log.create({
            garden_id: garden._id,
            level: 'INFO',
            message: 'Phân tích dữ liệu vườn hoàn tất và đã lưu vào lịch sử',
            source: 'SERVER'
          });
        } catch (logError) {
          console.error('Lỗi khi tạo log kết thúc phân tích:', logError);
        }
        
        // Trả về kết quả phân tích
        return res.status(200).json({
          success: true,
          analysis: {
            result: analysisResult,
            timestamp: new Date(),
            image: latestImage ? {
              url: latestImage.url,
              timestamp: latestImage.timestamp
            } : null
          }
        });
      } catch (error) {
        console.error('Gemini API Error:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        
        // Ghi log lỗi phân tích
        try {
          await Log.create({
            garden_id: garden._id,
            level: 'ERROR',
            message: `Lỗi khi phân tích dữ liệu vườn: ${error.message}`,
            source: 'SERVER'
          });
        } catch (logError) {
          console.error('Lỗi khi tạo log lỗi:', logError);
        }
        
        return res.status(500).json({
          success: false,
          message: 'Đã xảy ra lỗi khi phân tích dữ liệu vườn',
          error: error.message,
          details: error.response ? error.response.data : null
        });
      }
    } catch (error) {
      console.error('Error in Gemini API preparation:', error);
      
      // Ghi log lỗi phân tích
      try {
        await Log.create({
          garden_id: garden._id,
          level: 'ERROR',
          message: `Lỗi khi phân tích dữ liệu vườn: ${error.message}`,
          source: 'SERVER'
        });
      } catch (logError) {
        console.error('Lỗi khi tạo log lỗi:', logError);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi chuẩn bị phân tích dữ liệu vườn',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Lỗi chung khi phân tích vườn:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi không xác định khi phân tích vườn',
      error: error.message
    });
  }
};

/**
 * @desc    Lấy kết quả phân tích gần nhất
 * @route   GET /api/gardens/:id/analysis
 * @access  Private
 */
exports.getLatestAnalysis = async (req, res, next) => {
  try {
    console.log('====== GET LATEST ANALYSIS =======');
    console.log('Garden ID:', req.params.id);
    console.log('User:', req.user ? req.user._id : 'No user');
    console.log('==================================');
    
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn với ID này'
      });
    }
    
    // Kiểm tra xem người dùng có quyền truy cập vườn này không
    // Skip kiểm tra nếu user là admin
    if (req.user.role !== 'admin' && garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập vườn này'
      });
    }
    
    // Lấy kết quả phân tích gần nhất từ hình ảnh
    const latestImage = await Image.findOne({ 
      garden_id: garden._id,
      'analysis.status': 'completed'
    }).sort({ timestamp: -1 });
    
    if (latestImage && latestImage.analysis && latestImage.analysis.result) {
      return res.status(200).json({
        success: true,
        analysis: {
          result: latestImage.analysis.result,
          timestamp: latestImage.analysis.timestamp
        }
      });
    }
    
    // Không có dữ liệu phân tích, trả về lỗi 404
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy dữ liệu phân tích cho vườn này',
      error: 'NO_ANALYSIS_DATA'
    });
  } catch (error) {
    console.error('Lỗi khi lấy kết quả phân tích:', error);
    next(error);
  }
};

/**
 * @desc    Áp dụng đề xuất chăm sóc từ Gemini vào lịch trình
 * @route   POST /api/gardens/:id/apply-suggestions
 * @access  Private
 */
exports.applySuggestions = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn với ID này'
      });
    }
    
    // Kiểm tra xem người dùng có quyền truy cập vườn này không
    if (garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập vườn này'
      });
    }
    
    // Lấy danh sách đề xuất từ request body
    const { suggestions } = req.body;
    
    if (!suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp danh sách đề xuất hợp lệ'
      });
    }
    
    // Lấy lịch trình hiện tại
    const currentSchedules = await Schedule.find({ garden_id: garden._id });
    
    // Tạo lịch trình mới từ đề xuất
    const createdSchedules = [];
    
    for (const suggestion of suggestions) {
      // Kiểm tra đầu vào
      if (!suggestion.device || suggestion.action === undefined || !suggestion.time) {
        console.log('Bỏ qua đề xuất không hợp lệ:', suggestion);
        continue;
      }
      
      // Kiểm tra days và chuyển đổi nếu cần
      if (!suggestion.days) {
        console.log('Không có thông tin days trong đề xuất');
        continue;
      }
      
      console.log('Kiểu dữ liệu của days:', typeof suggestion.days, Array.isArray(suggestion.days));
      console.log('Giá trị của days:', JSON.stringify(suggestion.days));
      
      let daysToProcess = suggestion.days;
      
      // Nếu days là object (không phải array), chuyển về mảng các ngày có giá trị true
      if (typeof suggestion.days === 'object' && !Array.isArray(suggestion.days)) {
        daysToProcess = [];
        Object.entries(suggestion.days).forEach(([day, value]) => {
          if (value === true) {
            daysToProcess.push(day);
          }
        });
        console.log('Đã chuyển đổi days từ object sang array:', daysToProcess);
      }
      
      // Chuyển đổi thời gian từ "HH:MM" sang hour và minute
      const [hour, minute] = suggestion.time.split(':').map(Number);
      
      // Chuyển đổi mảng days thành mảng số (0: Chủ nhật, 1-6: Thứ 2 đến Thứ 7)
      const daysMap = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      
      const daysArray = Array.isArray(daysToProcess) 
        ? daysToProcess.map(day => {
            if (typeof day === 'string') {
              return daysMap[day.toLowerCase()];
            } 
            return null;
          }).filter(day => day !== null && day !== undefined)
        : [];
      
      console.log('Mảng days sau khi chuyển đổi:', daysArray);
      
      if (daysArray.length === 0) {
        console.log('Bỏ qua đề xuất vì không có ngày hợp lệ sau khi chuyển đổi');
        continue;
      }
      
      // Tạo lịch trình mới
      const schedule = await Schedule.create({
        garden_id: garden._id,
        device: suggestion.device,
        action: !!suggestion.action,
        hour,
        minute,
        days: daysArray,
        active: true,
        created_at: new Date(),
        created_by: req.user._id
      });
      
      createdSchedules.push(schedule);
      
      // Ghi log
      await Log.create({
        garden_id: garden._id,
        level: 'INFO',
        message: `Lịch trình mới được tạo từ đề xuất Gemini: ${suggestion.device} ${suggestion.action ? 'BẬT' : 'TẮT'} lúc ${hour}:${minute < 10 ? '0' + minute : minute}`,
        source: 'USER'
      });
    }
    
    // Bật chế độ tự động của vườn
    garden.settings.auto_mode = true;
    await garden.save();
    
    // Gửi thông báo
    await Notification.create({
      user_id: garden.user_id,
      garden_id: garden._id,
      title: 'Đã áp dụng đề xuất chăm sóc',
      message: `Đã tạo ${createdSchedules.length} lịch trình mới và kích hoạt chế độ tự động`,
      type: 'SCHEDULE',
      read: false
    });
    
    res.status(200).json({
      success: true,
      message: `Đã tạo ${createdSchedules.length} lịch trình mới và kích hoạt chế độ tự động`,
      data: {
        schedules: createdSchedules,
        auto_mode: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy lịch sử phân tích cho vườn
 * @route   GET /api/gardens/:id/analysis/history
 * @access  Private
 */
exports.getAnalysisHistory = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn với ID này'
      });
    }
    
    // Kiểm tra xem người dùng có quyền truy cập vườn này không
    if (garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập vườn này'
      });
    }
    
    // Lấy lịch sử phân tích từ collection Garden
    // Giả sử phân tích được lưu trong mảng analysis_history của garden
    const analysisHistory = garden.analysis_history || [];
    
    res.status(200).json({
      success: true,
      count: analysisHistory.length,
      data: analysisHistory
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử phân tích:', error);
    next(error);
  }
};

/**
 * @desc    Xóa một phân tích từ lịch sử
 * @route   DELETE /api/gardens/:id/analysis/:analysisId
 * @access  Private
 */
exports.deleteAnalysis = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn với ID này'
      });
    }
    
    // Kiểm tra xem người dùng có quyền truy cập vườn này không
    if (garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập vườn này'
      });
    }
    
    // Kiểm tra xem garden có mảng analysis_history không
    if (!garden.analysis_history || !Array.isArray(garden.analysis_history)) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch sử phân tích cho vườn này'
      });
    }
    
    // Tìm phân tích trong lịch sử
    const analysisIndex = garden.analysis_history.findIndex(
      analysis => analysis._id.toString() === req.params.analysisId
    );
    
    if (analysisIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phân tích với ID này'
      });
    }
    
    // Xóa phân tích khỏi mảng
    garden.analysis_history.splice(analysisIndex, 1);
    
    // Lưu lại vườn
    await garden.save();
    
    res.status(200).json({
      success: true,
      message: 'Đã xóa phân tích thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa phân tích:', error);
    next(error);
  }
}; 
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
    
    const historicalData = await SensorData.find({
      garden_id: garden._id,
      timestamp: { $gte: sevenDaysAgo }
    }).sort({ timestamp: 1 });
    
    // Lấy hình ảnh mới nhất nếu có
    let latestImage = null;
    if (garden.has_camera) {
      latestImage = await Image.findOne({ garden_id: garden._id })
        .sort({ timestamp: -1 });
    }
    
    // Chuẩn bị dữ liệu để gửi đến Gemini API
    const analysisData = {
      gardenInfo: {
        name: garden.name,
        description: garden.description
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
      thresholds: {
        temperature: {
          low: garden.settings.temperature_threshold_low,
          high: garden.settings.temperature_threshold_high
        },
        humidity: {
          low: garden.settings.humidity_threshold_low,
          high: garden.settings.humidity_threshold_high
        },
        light: {
          low: garden.settings.light_threshold_low,
          high: garden.settings.light_threshold_high
        },
        soil: {
          low: garden.settings.soil_threshold_low,
          high: garden.settings.soil_threshold_high
        }
      }
    };
    
    // Ghi log bắt đầu phân tích
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: 'Bắt đầu phân tích dữ liệu vườn với Gemini API',
      source: 'SERVER'
    });
    
    // Gọi Gemini API để phân tích dữ liệu
    // Lưu ý: Đây là một mẫu gọi API, cần thay thế bằng API key thật và endpoint thật
    try {
      // Mock API call - thay thế bằng gọi API thật
      // const response = await axios.post(
      //   'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
      //   {
      //     contents: [
      //       {
      //         parts: [
      //           {
      //             text: `Hãy phân tích dữ liệu vườn sau đây và đưa ra các đề xuất chăm sóc cây trồng: ${JSON.stringify(analysisData)}`
      //           }
      //         ]
      //       }
      //     ]
      //   },
      //   {
      //     headers: {
      //       'Content-Type': 'application/json',
      //       'x-goog-api-key': process.env.GEMINI_API_KEY
      //     }
      //   }
      // );
      
      // Dữ liệu mẫu - trong thực tế sẽ lấy từ phản hồi của Gemini API
      const analysisResult = {
        plantHealth: 'Khỏe mạnh',
        issues: [
          {
            type: 'Nhiệt độ',
            severity: 'Nhẹ',
            description: 'Nhiệt độ hiện tại cao hơn ngưỡng khuyến nghị một chút. Cần theo dõi.'
          }
        ],
        recommendations: [
          {
            title: 'Tưới nước',
            description: 'Nên tưới nước vào buổi sáng sớm để tránh bay hơi nước nhanh.',
            priority: 'Cao'
          },
          {
            title: 'Che nắng',
            description: 'Cân nhắc việc che nắng cho cây vào những ngày nắng gắt.',
            priority: 'Trung bình'
          }
        ],
        scheduleSuggestions: [
          {
            device: 'PUMP',
            action: true,
            time: '06:00',
            days: [0, 1, 2, 3, 4, 5, 6],
            description: 'Tưới nước mỗi sáng'
          },
          {
            device: 'FAN',
            action: true,
            time: '12:00',
            days: [0, 6],
            description: 'Bật quạt vào giữa trưa cuối tuần'
          }
        ],
        overallScore: 85
      };
      
      // Lưu kết quả phân tích vào Image (nếu có)
      if (latestImage) {
        latestImage.analysis = {
          status: 'completed',
          result: analysisResult,
          timestamp: new Date()
        };
        await latestImage.save();
      }
      
      // Tạo thông báo cho người dùng về kết quả phân tích
      await Notification.create({
        user_id: garden.user_id,
        garden_id: garden._id,
        title: 'Phân tích vườn hoàn tất',
        message: `Phân tích cho vườn ${garden.name} đã hoàn tất. Điểm sức khỏe tổng thể: ${analysisResult.overallScore}/100`,
        type: 'ANALYSIS',
        action_url: `/gardens/${garden._id}/analysis`,
        read: false
      });
      
      // Ghi log hoàn tất phân tích
      await Log.create({
        garden_id: garden._id,
        level: 'INFO',
        message: 'Đã hoàn tất phân tích dữ liệu vườn với Gemini API',
        source: 'SERVER'
      });
      
      res.status(200).json({
        success: true,
        data: analysisResult
      });
    } catch (error) {
      console.error('Gemini API Error:', error);
      
      // Ghi log lỗi phân tích
      await Log.create({
        garden_id: garden._id,
        level: 'ERROR',
        message: `Lỗi khi phân tích dữ liệu vườn: ${error.message}`,
        source: 'SERVER'
      });
      
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi phân tích dữ liệu vườn',
        error: error.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy kết quả phân tích gần nhất
 * @route   GET /api/gardens/:id/analysis
 * @access  Private
 */
exports.getLatestAnalysis = async (req, res, next) => {
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
    
    // Tìm hình ảnh có kết quả phân tích mới nhất
    const imageWithAnalysis = await Image.findOne({
      garden_id: garden._id,
      'analysis.status': 'completed'
    }).sort({ 'analysis.timestamp': -1 });
    
    if (!imageWithAnalysis || !imageWithAnalysis.analysis) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có kết quả phân tích nào cho vườn này'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        analysis: imageWithAnalysis.analysis,
        image: {
          id: imageWithAnalysis._id,
          url: imageWithAnalysis.url,
          timestamp: imageWithAnalysis.timestamp
        }
      }
    });
  } catch (error) {
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
      if (!suggestion.device || suggestion.action === undefined || 
          !suggestion.time || !suggestion.days || !Array.isArray(suggestion.days)) {
        continue;
      }
      
      // Chuyển đổi thời gian từ "HH:MM" sang hour và minute
      const [hour, minute] = suggestion.time.split(':').map(Number);
      
      // Tạo lịch trình mới
      const schedule = await Schedule.create({
        garden_id: garden._id,
        device: suggestion.device,
        action: !!suggestion.action,
        hour,
        minute,
        days: suggestion.days,
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
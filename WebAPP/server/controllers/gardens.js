const mongoose = require('mongoose');
const Garden = require('../models/Garden');
const SensorData = require('../models/SensorData');
const Device = require('../models/Device');
const mqttService = require('../services/mqttService');
const DeviceSerial = require('../models/DeviceSerial');

/**
 * @desc    Lấy tất cả khu vườn của người dùng đang đăng nhập
 * @route   GET /api/gardens
 * @access  Private
 */
exports.getGardens = async (req, res, next) => {
  try {
    const gardens = await Garden.find({ user_id: req.user._id });
    
    res.status(200).json({
      success: true,
      count: gardens.length,
      data: gardens
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thông tin chi tiết một khu vườn
 * @route   GET /api/gardens/:id
 * @access  Private
 */
exports.getGarden = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khu vườn với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    if (garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập khu vườn này'
      });
    }
    
    // Lấy dữ liệu cảm biến mới nhất
    const latestSensorData = await SensorData.findOne({ garden_id: garden._id })
      .sort({ timestamp: -1 });
    
    // Lấy danh sách thiết bị
    const devices = await Device.find({ garden_id: garden._id });
    
    // Thêm dữ liệu cảm biến và thiết bị vào đối tượng garden
    const gardenData = garden.toObject();
    gardenData.sensor_data = latestSensorData;
    gardenData.devices = devices;
    
    res.status(200).json({
      success: true,
      garden: gardenData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo khu vườn mới
 * @route   POST /api/gardens
 * @access  Private
 */
exports.createGarden = async (req, res, next) => {
  try {
    // Thêm user_id vào dữ liệu vườn
    req.body.user_id = req.user._id;
    
    // Kiểm tra xem người dùng đã có vườn với mã thiết bị này chưa
    if (req.body.device_serial) {
      const existingGarden = await Garden.findOne({
        user_id: req.user._id,
        device_serial: req.body.device_serial
      });
      
      if (existingGarden) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã có vườn với mã thiết bị này'
        });
      }
      
      // Kiểm tra và cập nhật trạng thái của DeviceSerial
      const deviceSerial = await DeviceSerial.findOne({ serial: req.body.device_serial });
      
      if (!deviceSerial) {
        return res.status(400).json({
          success: false,
          message: 'Mã thiết bị không tồn tại trong hệ thống'
        });
      }
      
      if (deviceSerial.is_activated) {
        return res.status(400).json({
          success: false,
          message: 'Mã thiết bị đã được kích hoạt bởi vườn khác'
        });
      }

      // Xử lý trường has_camera và camera_serial
      if (req.body.has_camera) {
        // Nếu có camera_serial được cung cấp trong DeviceSerial, sử dụng nó
        if (deviceSerial.camera_serial && deviceSerial.camera_serial.trim() !== '') {
          req.body.camera_serial = deviceSerial.camera_serial;
        } 
        // Nếu không, tạo camera_serial từ device_serial
        else {
          // Tạo camera_serial theo định dạng CAM + số của device_serial
          // Ví dụ: GARDEN8228 -> CAM8228
          if (req.body.device_serial.startsWith('GARDEN')) {
            req.body.camera_serial = 'CAM' + req.body.device_serial.replace('GARDEN', '');
          } else {
            req.body.camera_serial = 'CAM' + req.body.device_serial;
          }
        }

        console.log(`Tạo vườn với camera, device_serial: ${req.body.device_serial}, camera_serial: ${req.body.camera_serial}`);
      }
    }
    
    // Tạo vườn mới
    const garden = await Garden.create(req.body);
    
    // Cập nhật trạng thái của DeviceSerial nếu có
    if (req.body.device_serial) {
      await DeviceSerial.findOneAndUpdate(
        { serial: req.body.device_serial },
        { 
          is_activated: true,
          activated_by: req.user._id,
          garden_id: garden._id,
          activation_date: new Date(),
          camera_serial: req.body.camera_serial || '' // Cập nhật camera_serial
        }
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Khu vườn đã được tạo thành công',
      data: garden
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin khu vườn
 * @route   PUT /api/gardens/:id
 * @access  Private
 */
exports.updateGarden = async (req, res, next) => {
  try {
    let garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khu vườn với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    if (garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền cập nhật khu vườn này'
      });
    }
    
    // Ngăn cản việc thay đổi user_id
    if (req.body.user_id) {
      delete req.body.user_id;
    }
    
    // Kiểm tra xem tên mới đã tồn tại chưa (nếu đổi tên)
    if (req.body.name && req.body.name !== garden.name) {
      const existingGarden = await Garden.findOne({
        user_id: req.user._id,
        name: req.body.name,
        _id: { $ne: req.params.id }
      });
      
      if (existingGarden) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã có khu vườn với tên này'
        });
      }
    }
    
    // Cập nhật khu vườn
    garden = await Garden.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Khu vườn đã được cập nhật thành công',
      data: garden
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa khu vườn
 * @route   DELETE /api/gardens/:id
 * @access  Private
 */
exports.deleteGarden = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khu vườn với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    if (garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xóa khu vườn này'
      });
    }
    
    // Xóa khu vườn và dữ liệu liên quan
    await Garden.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Khu vườn đã được xóa thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật cài đặt ngưỡng cảnh báo
 * @route   PUT /api/gardens/:id/thresholds
 * @access  Private
 */
exports.updateThresholds = async (req, res, next) => {
  try {
    let garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khu vườn với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    if (garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền cập nhật khu vườn này'
      });
    }
    
    // Cập nhật ngưỡng cảnh báo
    const thresholds = req.body;
    garden.thresholds = {
      ...garden.thresholds,
      ...thresholds
    };
    
    await garden.save();
    
    res.status(200).json({
      success: true,
      message: 'Ngưỡng cảnh báo đã được cập nhật thành công',
      data: garden.thresholds
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đồng bộ trạng thái khu vườn
 * @route   POST /api/gardens/:id/sync
 * @access  Private
 */
exports.syncGardenState = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khu vườn với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    if (garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập khu vườn này'
      });
    }
    
    // Kiểm tra xem khu vườn đã được kết nối chưa
    if (!garden.is_connected) {
      return res.status(400).json({
        success: false,
        message: 'Khu vườn hiện không kết nối. Không thể đồng bộ.'
      });
    }
    
    // Gửi yêu cầu đồng bộ qua MQTT
    mqttService.syncGardenState(garden._id);
    
    res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu đồng bộ khu vườn thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xác thực mã thiết bị
 * @route   POST /api/gardens/verify
 * @access  Private
 */
exports.verifyDeviceSerial = async (req, res, next) => {
  try {
    const { deviceSerial } = req.body;
    
    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã thiết bị (deviceSerial)'
      });
    }
    
    // Kiểm tra xem mã thiết bị có tồn tại trong bảng DeviceSerial không
    const deviceSerialRecord = await DeviceSerial.findOne({ serial: deviceSerial });
    
    if (!deviceSerialRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã thiết bị không tồn tại trong hệ thống'
      });
    }
    
    // Kiểm tra xem thiết bị đã được kích hoạt chưa
    if (deviceSerialRecord.is_activated) {
      return res.status(400).json({
        success: false,
        message: 'Mã thiết bị đã được kích hoạt bởi vườn khác'
      });
    }
    
    // Kiểm tra xem mã thiết bị đã được đăng ký cho vườn nào chưa
    const garden = await Garden.findOne({ device_serial: deviceSerial });
    
    if (garden) {
      // Nếu đã đăng ký, kiểm tra xem có phải của người dùng hiện tại không
      if (garden.user_id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã đăng ký vườn với mã thiết bị này'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Mã thiết bị đã được đăng ký bởi người dùng khác'
        });
      }
    }
    
    // Mã thiết bị hợp lệ và chưa được đăng ký
    res.status(200).json({
      success: true,
      message: 'Mã thiết bị hợp lệ và có thể sử dụng',
      data: {
        deviceSerial
      }
    });
  } catch (error) {
    console.error('Error in verifyDeviceSerial:', error);
    next(error);
  }
};

/**
 * @desc    Điều khiển camera chụp ảnh
 * @route   POST /api/gardens/camera/:deviceSerial/capture
 * @access  Private
 */
exports.captureImage = async (req, res) => {
  try {
    const { deviceSerial } = req.params;
    console.log(`[DEBUG] Đang xử lý request chụp ảnh cho camera: ${deviceSerial}`);
    
    // Tìm vườn theo camera_serial
    const garden = await Garden.findOne({ camera_serial: deviceSerial });
    
    // Log kết quả tìm kiếm
    console.log(`[DEBUG] Kết quả tìm vườn: ${garden ? 'Tìm thấy' : 'Không tìm thấy'}`);
    
    if (garden) {
      console.log(`[DEBUG] Garden details: ID=${garden._id}, Device=${garden.device_serial}, CameraSerial=${garden.camera_serial}, UserId=${garden.user_id}, ReqUserId=${req.user._id}`);
      
      // Kiểm tra quyền truy cập
      if (garden.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        console.log('[DEBUG] Từ chối quyền truy cập: Người dùng không có quyền truy cập vào vườn này');
        return res.status(403).json({ message: 'Bạn không có quyền truy cập vào vườn này' });
      }
      
      // Không kiểm tra trạng thái kết nối camera
      /*
      if (!garden.camera_is_connected) {
        console.log('[DEBUG] Từ chối yêu cầu: Camera không kết nối');
        return res.status(400).json({ message: 'Camera không kết nối' });
      }
      */
      
      console.log(`[DEBUG] Gửi lệnh chụp ảnh đến camera với serial: ${deviceSerial}`);
      
      // Chụp ảnh thông qua MQTT
      await mqttService.takePhoto(deviceSerial, garden._id.toString());
      
      return res.status(200).json({ message: 'Đã gửi lệnh chụp ảnh đến camera' });
    } else {
      console.log('[DEBUG] Không tìm thấy vườn với camera_serial: ' + deviceSerial);
      return res.status(404).json({ message: 'Không tìm thấy vườn với camera này' });
    }
  } catch (error) {
    console.error('[ERROR] Lỗi xử lý chụp ảnh:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

/**
 * @desc    Điều khiển stream video
 * @route   POST /api/gardens/camera/:deviceSerial/stream
 * @access  Private
 */
exports.controlStream = async (req, res) => {
  try {
    const { deviceSerial } = req.params;
    const { enable = true } = req.body;
    
    console.log(`[DEBUG] Đang xử lý request stream cho camera: ${deviceSerial}, enable=${enable}`);
    
    // Tìm vườn theo camera_serial
    const garden = await Garden.findOne({ camera_serial: deviceSerial });
    
    // Log kết quả tìm kiếm
    console.log(`[DEBUG] Kết quả tìm vườn: ${garden ? 'Tìm thấy' : 'Không tìm thấy'}`);
    
    if (garden) {
      console.log(`[DEBUG] Garden details: ID=${garden._id}, Device=${garden.device_serial}, CameraSerial=${garden.camera_serial}, UserId=${garden.user_id}, ReqUserId=${req.user._id}`);
      
      // Kiểm tra quyền truy cập
      if (garden.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        console.log('[DEBUG] Từ chối quyền truy cập: Người dùng không có quyền truy cập vào vườn này');
        return res.status(403).json({ message: 'Bạn không có quyền truy cập vào vườn này' });
      }
      
      // Không kiểm tra trạng thái kết nối camera
      /*
      if (!garden.camera_is_connected) {
        console.log('[DEBUG] Từ chối yêu cầu: Camera không kết nối');
        return res.status(400).json({ message: 'Camera không kết nối' });
      }
      */
      
      console.log(`[DEBUG] Gửi lệnh điều khiển stream đến camera với serial: ${deviceSerial}, enable=${enable}`);
      
      // Điều khiển stream thông qua MQTT
      await mqttService.controlStream(deviceSerial, enable, garden._id.toString());
      
      return res.status(200).json({ 
        message: enable ? 'Đã gửi lệnh bắt đầu stream đến camera' : 'Đã gửi lệnh dừng stream đến camera' 
      });
    } else {
      console.log('[DEBUG] Không tìm thấy vườn với camera_serial: ' + deviceSerial);
      return res.status(404).json({ message: 'Không tìm thấy vườn với camera này' });
    }
  } catch (error) {
    console.error('[ERROR] Lỗi xử lý điều khiển stream:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}; 
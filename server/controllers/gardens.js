const mongoose = require('mongoose');
const Garden = require('../models/Garden');
const SensorData = require('../models/SensorData');
const Device = require('../models/Device');
const mqttService = require('../services/mqttService');

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
    
    res.status(200).json({
      success: true,
      data: {
        garden,
        latestSensorData,
        devices
      }
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
    // Thêm user_id vào dữ liệu
    req.body.user_id = req.user._id;
    
    // Kiểm tra xem tên khu vườn đã tồn tại chưa
    const existingGarden = await Garden.findOne({ 
      user_id: req.user._id,
      name: req.body.name
    });
    
    if (existingGarden) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã có khu vườn với tên này'
      });
    }
    
    // Tạo khu vườn mới
    const garden = await Garden.create(req.body);
    
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
    
    // Xóa khu vườn và dữ liệu liên quan (sử dụng middleware pre-remove)
    await garden.remove();
    
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
    
    // Kiểm tra xem mã thiết bị đã được đăng ký chưa
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
    next(error);
  }
}; 
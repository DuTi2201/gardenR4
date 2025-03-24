const mongoose = require('mongoose');
const Device = require('../models/Device');
const Garden = require('../models/Garden');
const DeviceHistory = require('../models/DeviceHistory');
const mqttService = require('../services/mqttService');
const SensorData = require('../models/SensorData');

/**
 * @desc    Lấy danh sách thiết bị của khu vườn
 * @route   GET /api/gardens/:gardenId/devices
 * @access  Private
 */
exports.getDevices = async (req, res, next) => {
  try {
    const { gardenId } = req.params;

    // Kiểm tra xem khu vườn có tồn tại không
    const garden = await Garden.findById(gardenId);
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

    // Lấy danh sách thiết bị
    const devices = await Device.find({ garden_id: gardenId });
    
    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thông tin chi tiết một thiết bị
 * @route   GET /api/devices/:id
 * @access  Private
 */
exports.getDevice = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    const garden = await Garden.findById(device.garden_id);
    if (!garden || garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập thiết bị này'
      });
    }
    
    res.status(200).json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo thiết bị mới
 * @route   POST /api/gardens/:gardenId/devices
 * @access  Private
 */
exports.createDevice = async (req, res, next) => {
  try {
    const { gardenId } = req.params;

    // Kiểm tra xem khu vườn có tồn tại không
    const garden = await Garden.findById(gardenId);
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

    // Thêm garden_id vào dữ liệu
    req.body.garden_id = gardenId;
    
    // Kiểm tra xem device_id đã tồn tại chưa
    if (req.body.device_id) {
      const existingDevice = await Device.findOne({ 
        device_id: req.body.device_id,
        garden_id: gardenId
      });
      
      if (existingDevice) {
        return res.status(400).json({
          success: false,
          message: 'Thiết bị với ID này đã tồn tại trong khu vườn'
        });
      }
    }
    
    // Tạo thiết bị mới
    const device = await Device.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Thiết bị đã được tạo thành công',
      data: device
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin thiết bị
 * @route   PUT /api/devices/:id
 * @access  Private
 */
exports.updateDevice = async (req, res, next) => {
  try {
    let device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    const garden = await Garden.findById(device.garden_id);
    if (!garden || garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền cập nhật thiết bị này'
      });
    }
    
    // Không cho phép thay đổi garden_id
    if (req.body.garden_id && req.body.garden_id !== device.garden_id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Không thể thay đổi khu vườn của thiết bị'
      });
    }
    
    // Cập nhật thiết bị
    device = await Device.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Thiết bị đã được cập nhật thành công',
      data: device
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa thiết bị
 * @route   DELETE /api/devices/:id
 * @access  Private
 */
exports.deleteDevice = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    const garden = await Garden.findById(device.garden_id);
    if (!garden || garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xóa thiết bị này'
      });
    }
    
    // Xóa thiết bị
    await device.remove();
    
    res.status(200).json({
      success: true,
      message: 'Thiết bị đã được xóa thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Điều khiển thiết bị
 * @route   POST /api/devices/:id/control
 * @access  Private
 */
exports.controlDevice = async (req, res, next) => {
  try {
    const { action, value } = req.body;
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    const garden = await Garden.findById(device.garden_id);
    if (!garden || garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền điều khiển thiết bị này'
      });
    }
    
    // Kiểm tra xem khu vườn có kết nối không
    if (!garden.is_connected) {
      return res.status(400).json({
        success: false,
        message: 'Thiết bị không trực tuyến. Không thể điều khiển'
      });
    }
    
    // Kiểm tra hành động hợp lệ
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp hành động'
      });
    }
    
    // Gửi lệnh điều khiển qua MQTT
    mqttService.sendDeviceCommand(garden._id, device.device_id, action, value);
    
    // Thêm lịch sử thiết bị
    await DeviceHistory.create({
      device_id: device._id,
      garden_id: garden._id,
      device: device.category,
      action: action,
      source: 'USER',
      user_id: req.user._id
    });
    
    res.status(200).json({
      success: true,
      message: `Đã gửi lệnh ${action} tới thiết bị thành công`,
      data: {
        device: device.device_id,
        action,
        value
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy lịch sử hoạt động của thiết bị
 * @route   GET /api/devices/:id/history
 * @access  Private
 */
exports.getDeviceHistory = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    const garden = await Garden.findById(device.garden_id);
    if (!garden || garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập lịch sử thiết bị này'
      });
    }
    
    // Lấy các thông số truy vấn
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    // Tạo điều kiện truy vấn
    const query = { device_id: device._id };
    
    if (startDate && endDate) {
      query.timestamp = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.timestamp = { $gte: startDate };
    } else if (endDate) {
      query.timestamp = { $lte: endDate };
    }
    
    // Lấy số lượng lịch sử
    const total = await DeviceHistory.countDocuments(query);
    
    // Lấy danh sách lịch sử, sắp xếp theo thời gian mới nhất
    const history = await DeviceHistory.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: history.length,
      total,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit)
      },
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy trạng thái tất cả thiết bị trong vườn
 * @route   GET /api/gardens/:id/devices
 * @access  Private
 */
exports.getDevicesStatus = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn'
      });
    }
    
    // Kiểm tra quyền sở hữu
    if (garden.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập vườn này'
      });
    }
    
    // Lấy dữ liệu cảm biến mới nhất để biết trạng thái thiết bị
    const latestSensorData = await SensorData.findOne({ garden_id: garden._id })
      .sort({ timestamp: -1 });
    
    let deviceStatus = {
      fan: false,
      light: false,
      pump: false,
      pump2: false,
      auto_mode: garden.settings.auto_mode
    };
    
    if (latestSensorData) {
      deviceStatus = {
        fan: latestSensorData.fan_status,
        light: latestSensorData.light_status,
        pump: latestSensorData.pump_status,
        pump2: latestSensorData.pump2_status,
        auto_mode: latestSensorData.auto_mode
      };
    }
    
    res.status(200).json({
      success: true,
      data: {
        deviceStatus,
        garden
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đồng bộ trạng thái thiết bị
 * @route   POST /api/gardens/:id/devices/sync
 * @access  Private
 */
exports.syncDevices = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn'
      });
    }
    
    // Kiểm tra quyền sở hữu
    if (garden.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền đồng bộ vườn này'
      });
    }
    
    // Gửi lệnh đồng bộ
    await mqttService.syncGardenState(garden.device_serial);
    
    res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu đồng bộ thiết bị'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy lịch sử điều khiển thiết bị
 * @route   GET /api/gardens/:id/devices/history
 * @access  Private
 */
exports.getDeviceHistory = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.id);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn'
      });
    }
    
    // Kiểm tra quyền sở hữu
    if (garden.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập vườn này'
      });
    }
    
    // Lấy lịch sử điều khiển thiết bị
    const deviceHistory = await DeviceHistory.find({ garden_id: garden._id })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('user_id', 'fullname email');
    
    res.status(200).json({
      success: true,
      count: deviceHistory.length,
      data: deviceHistory
    });
  } catch (error) {
    next(error);
  }
}; 
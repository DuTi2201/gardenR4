const mongoose = require('mongoose');
const Device = require('../models/Device');
const Garden = require('../models/Garden');
const DeviceHistory = require('../models/DeviceHistory');
const mqttService = require('../services/mqttService');
const SensorData = require('../models/SensorData');

/**
 * @desc    Lấy danh sách thiết bị của khu vườn
 * @route   GET /api/gardens/:id/devices
 * @access  Private
 */
exports.getDevices = async (req, res, next) => {
  try {
    console.log('========= DEBUG DEVICES REQUEST =========');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    console.log('Request params:', req.params);
    console.log('User ID:', req.user ? req.user._id : 'No user ID');
    console.log('User Role:', req.user ? req.user.role : 'No user role');
    console.log('============================================');
    
    // Sử dụng id thay vì gardenId để phù hợp với tham số URL
    const gardenId = req.params.id;
    console.log(`Đang lấy danh sách thiết bị cho vườn ID: ${gardenId}`);
    
    if (!mongoose.Types.ObjectId.isValid(gardenId)) {
      console.log(`Garden ID không hợp lệ: ${gardenId}`);
      return res.status(400).json({
        success: false,
        message: 'ID vườn không hợp lệ'
      });
    }

    // Kiểm tra xem khu vườn có tồn tại không
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      console.log(`Không tìm thấy vườn với ID: ${gardenId}`);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khu vườn với ID này'
      });
    }
    
    console.log(`Đã tìm thấy vườn: ${garden.name}, thuộc về user: ${garden.user_id}`);

    // Kiểm tra quyền truy cập
    // Skip kiểm tra quyền nếu người dùng là admin
    if (req.user.role !== 'admin' && garden.user_id.toString() !== req.user._id.toString()) {
      console.log(`Người dùng ${req.user._id} không có quyền truy cập vườn ${garden._id} (thuộc về ${garden.user_id})`);
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập khu vườn này'
      });
    }

    // Lấy danh sách thiết bị
    const devices = await Device.find({ garden_id: gardenId });
    console.log(`Tìm thấy ${devices.length} thiết bị cho vườn ID: ${gardenId}`);
    
    // Nếu có thiết bị, trả về danh sách
    if (devices.length > 0) {
      return res.status(200).json({
        success: true,
        count: devices.length,
        data: devices
      });
    }
    
    // Nếu không có thiết bị và client yêu cầu dữ liệu giả, tạo dữ liệu giả
    // Kiểm tra query param mock=true hoặc mặc định cho phép dữ liệu giả
    const allowMock = req.query.mock === 'true' || true;
    
    if (allowMock) {
      console.log(`Không tìm thấy thiết bị thật cho vườn ID: ${gardenId}, trả về dữ liệu mẫu`);
      
      // Lấy dữ liệu cảm biến mới nhất để biết trạng thái
      const latestSensorData = await SensorData.findOne({ garden_id: garden._id })
        .sort({ timestamp: -1 });
      
      // Trạng thái mặc định
      let deviceStatus = {
        fan: false,
        light: false,
        pump: false,
        pump2: false,
        auto_mode: garden.settings?.auto_mode || false
      };
      
      // Nếu có dữ liệu cảm biến, cập nhật trạng thái
      if (latestSensorData) {
        deviceStatus = {
          fan: latestSensorData.fan_status || false,
          light: latestSensorData.light_status || false,
          pump: latestSensorData.pump_status || false,
          pump2: latestSensorData.pump2_status || false,
          auto_mode: latestSensorData.auto_mode || garden.settings?.auto_mode || false
        };
      }
      
      // Trả về cấu trúc đơn giản mà frontend có thể xử lý được
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        devices: deviceStatus,
        is_mock: true,
        message: 'Trả về trạng thái thiết bị mẫu vì chưa có thiết bị thực'
      });
    }
    
    // Nếu không có thiết bị và không cho phép dữ liệu giả, trả về mảng rỗng
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thiết bị:', error);
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
 * @route   POST /api/gardens/:id/devices
 * @access  Private
 */
exports.createDevice = async (req, res, next) => {
  try {
    console.log('========= DEBUG CREATE DEVICE REQUEST =========');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('User ID:', req.user ? req.user._id : 'No user ID');
    console.log('User Role:', req.user ? req.user.role : 'No user role');
    console.log('============================================');
    
    // Sử dụng id thay vì gardenId để phù hợp với tham số URL
    const gardenId = req.params.id;
    console.log(`Đang tạo thiết bị mới cho vườn ID: ${gardenId}`);

    if (!mongoose.Types.ObjectId.isValid(gardenId)) {
      console.log(`Garden ID không hợp lệ: ${gardenId}`);
      return res.status(400).json({
        success: false,
        message: 'ID vườn không hợp lệ'
      });
    }

    // Kiểm tra xem khu vườn có tồn tại không
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      console.log(`Không tìm thấy vườn với ID: ${gardenId}`);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khu vườn với ID này'
      });
    }
    
    console.log(`Đã tìm thấy vườn: ${garden.name}, thuộc về user: ${garden.user_id}`);

    // Kiểm tra quyền truy cập
    // Skip kiểm tra quyền nếu người dùng là admin
    if (req.user.role !== 'admin' && garden.user_id.toString() !== req.user._id.toString()) {
      console.log(`Người dùng ${req.user._id} không có quyền truy cập vườn ${garden._id} (thuộc về ${garden.user_id})`);
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
        console.log(`Device ID ${req.body.device_id} đã tồn tại trong vườn ${gardenId}`);
        return res.status(400).json({
          success: false,
          message: 'Thiết bị với ID này đã tồn tại trong khu vườn'
        });
      }
    }
    
    // Tạo thiết bị mới
    const device = await Device.create(req.body);
    console.log(`Đã tạo thiết bị mới với ID: ${device._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Thiết bị đã được tạo thành công',
      data: device
    });
  } catch (error) {
    console.error('Lỗi khi tạo thiết bị mới:', error);
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
 * @desc    Điều khiển thiết bị trong khu vườn thông qua MQTT
 * @route   POST /api/gardens/:id/devices/control
 * @access  Private
 */
exports.controlDevice = async (req, res, next) => {
  try {
    console.log('========= DEBUG DEVICE CONTROL REQUEST =========');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('User ID:', req.user ? req.user._id : 'No user ID');
    console.log('User Role:', req.user ? req.user.role : 'No user role');
    console.log('============================================');
    
    // Lấy ID vườn từ params
    const gardenId = req.params.id;
    console.log(`Đang xử lý yêu cầu điều khiển thiết bị cho vườn ID: ${gardenId}`);
    
    if (!mongoose.Types.ObjectId.isValid(gardenId)) {
      console.log(`Garden ID không hợp lệ: ${gardenId}`);
      return res.status(400).json({
        success: false,
        message: 'ID vườn không hợp lệ'
      });
    }
    
    // Lấy thông tin vườn
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      console.log(`Không tìm thấy vườn với ID: ${gardenId}`);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập vườn
    if (req.user.role !== 'admin' && garden.user_id.toString() !== req.user._id.toString()) {
      console.log(`Người dùng ${req.user._id} không có quyền truy cập vườn ${garden._id} (thuộc về ${garden.user_id})`);
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập vườn này'
      });
    }
    
    // Lấy thông tin thiết bị và trạng thái từ body
    const { device, action } = req.body;
    
    if (!device || action === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin thiết bị và trạng thái'
      });
    }
    
    // Validate loại thiết bị
    const validDevices = ['FAN', 'LIGHT', 'PUMP', 'PUMP_2', 'AUTO', 'ALL'];
    if (!validDevices.includes(device)) {
      return res.status(400).json({
        success: false,
        message: 'Loại thiết bị không hợp lệ'
      });
    }
    
    // Validate trạng thái
    if (typeof action !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái phải là true hoặc false'
      });
    }
    
    // Kiểm tra thiết bị có hoạt động không
    if (!garden.is_connected && device !== 'AUTO') {
      console.log(`Thiết bị ${garden.device_serial} không kết nối, không thể điều khiển`);
      return res.status(400).json({
        success: false,
        message: 'Thiết bị không kết nối. Không thể điều khiển'
      });
    }
    
    // Thực hiện điều khiển thiết bị qua MQTT Service
    try {
      // Tạo ID giao dịch cho theo dõi
      const transactionId = new mongoose.Types.ObjectId().toString();
      
      // Gửi lệnh qua MQTT
      await mqttService.sendCommand(garden.device_serial, device, action, req.user);
      
      // Gửi cập nhật trạng thái thiết bị cho client thông qua socket.io
      const io = req.app.get('socketio');
      if (io) {
        console.log(`[SOCKET] Emitting device_status_update to room ${garden._id.toString()} for device ${device}`);
        io.to(garden._id.toString()).emit('device_status_update', {
          device: device.toLowerCase(),
          state: action,
          timestamp: new Date()
        });
      }
      
      // Lưu lịch sử hoạt động thiết bị
      await DeviceHistory.create({
        garden_id: garden._id,
        user_id: req.user._id,
        device: device,
        action: action,
        transaction_id: transactionId,
        source: 'WEB',
        timestamp: new Date()
      });
      
      // Trả về phản hồi
      return res.status(200).json({
        success: true,
        message: `Đã gửi lệnh ${action ? 'BẬT' : 'TẮT'} ${device} đến thiết bị ${garden.device_serial}`,
        transaction_id: transactionId,
        data: {
          garden_id: garden._id,
          device_serial: garden.device_serial,
          device: device,
          action: action
        }
      });
    } catch (mqttError) {
      console.error('Lỗi gửi lệnh MQTT:', mqttError);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi gửi lệnh đến thiết bị',
        error: mqttError.message
      });
    }
  } catch (error) {
    console.error('Lỗi điều khiển thiết bị:', error);
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

/**
 * @desc    Bật/tắt chế độ tự động cho khu vườn
 * @route   POST /api/gardens/:id/auto-mode
 * @access  Private
 */
exports.toggleAutoMode = async (req, res, next) => {
  try {
    const gardenId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(gardenId)) {
      return res.status(400).json({
        success: false,
        message: 'ID vườn không hợp lệ'
      });
    }

    // Tìm khu vườn
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khu vườn với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    if (req.user.role !== 'admin' && garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập khu vườn này'
      });
    }
    
    // Lấy trạng thái từ body request
    const { action } = req.body;
    
    if (typeof action !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái chế độ tự động phải là boolean (true/false)'
      });
    }
    
    // Cập nhật cài đặt của khu vườn
    garden.settings = {
      ...garden.settings,
      auto_mode: action
    };
    await garden.save();
    
    // Thông báo qua MQTT nếu được kết nối
    if (garden.is_connected) {
      try {
        await mqttService.sendCommand(garden.device_serial, 'AUTO', action, req.user);
      } catch (mqttError) {
        console.error('Lỗi gửi lệnh MQTT:', mqttError);
        // Tiếp tục xử lý ngay cả khi MQTT thất bại
      }
    }
    
    // Gửi cập nhật trạng thái thiết bị cho client thông qua socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.to(garden._id.toString()).emit('auto_mode_update', {
        auto_mode: action,
        timestamp: new Date()
      });
    }
    
    // Lưu lịch sử hoạt động
    await DeviceHistory.create({
      garden_id: garden._id,
      user_id: req.user._id,
      device: 'AUTO',
      action: action ? 'ON' : 'OFF',
      source: 'USER',
      timestamp: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: `Đã ${action ? 'bật' : 'tắt'} chế độ tự động cho khu vườn`,
      data: {
        garden_id: garden._id,
        auto_mode: action
      }
    });
  } catch (error) {
    console.error('Lỗi khi thay đổi chế độ tự động:', error);
    next(error);
  }
}; 
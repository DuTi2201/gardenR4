const mongoose = require('mongoose');
const Garden = require('../models/Garden');
const Schedule = require('../models/Schedule');
const Log = require('../models/Log');

/**
 * @desc    Lấy danh sách lịch trình của vườn
 * @route   GET /api/gardens/:gardenId/schedules
 * @access  Private
 */
exports.getSchedules = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.gardenId);
    
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
    
    // Lấy danh sách lịch trình, sắp xếp theo thời gian
    const schedules = await Schedule.find({ garden_id: garden._id })
      .sort({ hour: 1, minute: 1 });
    
    // Cập nhật trạng thái kích hoạt dựa trên auto_mode
    const schedulesWithActiveStatus = schedules.map(schedule => {
      // Tạo một đối tượng mới để không ảnh hưởng đến dữ liệu gốc
      const scheduleObj = schedule.toObject();
      
      // Nếu auto_mode = false, các lịch trình sẽ bị vô hiệu hóa tạm thời
      scheduleObj.effective_active = garden.settings.auto_mode ? schedule.active : false;
      
      return scheduleObj;
    });
    
    res.status(200).json({
      success: true,
      count: schedulesWithActiveStatus.length,
      data: schedulesWithActiveStatus,
      garden_auto_mode: garden.settings.auto_mode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo lịch trình mới
 * @route   POST /api/gardens/:gardenId/schedules
 * @access  Private
 */
exports.createSchedule = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.gardenId);
    
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
    
    // Kiểm tra đầu vào
    const { device, action, hour, minute, days } = req.body;
    
    if (!device || action === undefined || hour === undefined || minute === undefined || !days) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin lịch trình'
      });
    }
    
    // Kiểm tra device hợp lệ
    const validDevices = ['FAN', 'LIGHT', 'PUMP', 'PUMP_2'];
    if (!validDevices.includes(device)) {
      return res.status(400).json({
        success: false,
        message: 'Thiết bị không hợp lệ'
      });
    }
    
    // Kiểm tra thời gian hợp lệ
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian không hợp lệ'
      });
    }
    
    // Kiểm tra ngày trong tuần hợp lệ
    if (!Array.isArray(days) || days.some(day => day < 0 || day > 6)) {
      return res.status(400).json({
        success: false,
        message: 'Ngày trong tuần không hợp lệ'
      });
    }
    
    // Tạo lịch trình mới
    const schedule = await Schedule.create({
      garden_id: garden._id,
      device,
      action: !!action, // Đảm bảo là boolean
      hour,
      minute,
      days,
      active: true,
      created_at: new Date(),
      created_by: req.user._id
    });
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: `Lịch trình mới được tạo: ${device} ${action ? 'BẬT' : 'TẮT'} lúc ${hour}:${minute < 10 ? '0' + minute : minute}`,
      source: 'USER'
    });
    
    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật lịch trình
 * @route   PUT /api/gardens/:gardenId/schedules/:id
 * @access  Private
 */
exports.updateSchedule = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.gardenId);
    
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
    
    // Tìm lịch trình cần cập nhật
    let schedule = await Schedule.findOne({
      _id: req.params.id,
      garden_id: garden._id
    });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình với ID này'
      });
    }
    
    // Cập nhật lịch trình
    const fieldsToUpdate = {};
    
    // Chỉ cập nhật các trường được gửi lên
    if (req.body.device) {
      const validDevices = ['FAN', 'LIGHT', 'PUMP', 'PUMP_2'];
      if (!validDevices.includes(req.body.device)) {
        return res.status(400).json({
          success: false,
          message: 'Thiết bị không hợp lệ'
        });
      }
      fieldsToUpdate.device = req.body.device;
    }
    
    if (req.body.action !== undefined) {
      fieldsToUpdate.action = !!req.body.action; // Đảm bảo là boolean
    }
    
    if (req.body.hour !== undefined) {
      if (req.body.hour < 0 || req.body.hour > 23) {
        return res.status(400).json({
          success: false,
          message: 'Giờ không hợp lệ'
        });
      }
      fieldsToUpdate.hour = req.body.hour;
    }
    
    if (req.body.minute !== undefined) {
      if (req.body.minute < 0 || req.body.minute > 59) {
        return res.status(400).json({
          success: false,
          message: 'Phút không hợp lệ'
        });
      }
      fieldsToUpdate.minute = req.body.minute;
    }
    
    if (req.body.days) {
      if (!Array.isArray(req.body.days) || req.body.days.some(day => day < 0 || day > 6)) {
        return res.status(400).json({
          success: false,
          message: 'Ngày trong tuần không hợp lệ'
        });
      }
      fieldsToUpdate.days = req.body.days;
    }
    
    if (req.body.active !== undefined) {
      fieldsToUpdate.active = !!req.body.active; // Đảm bảo là boolean
    }
    
    schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: `Lịch trình đã được cập nhật: ${schedule.device} ${schedule.action ? 'BẬT' : 'TẮT'} lúc ${schedule.hour}:${schedule.minute < 10 ? '0' + schedule.minute : schedule.minute}`,
      source: 'USER'
    });
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa lịch trình
 * @route   DELETE /api/gardens/:gardenId/schedules/:id
 * @access  Private
 */
exports.deleteSchedule = async (req, res, next) => {
  try {
    const garden = await Garden.findById(req.params.gardenId);
    
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
    
    // Tìm và xóa lịch trình
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      garden_id: garden._id
    });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình với ID này'
      });
    }
    
    await schedule.remove();
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: `Lịch trình đã bị xóa: ${schedule.device} ${schedule.action ? 'BẬT' : 'TẮT'} lúc ${schedule.hour}:${schedule.minute < 10 ? '0' + schedule.minute : schedule.minute}`,
      source: 'USER'
    });
    
    res.status(200).json({
      success: true,
      message: 'Lịch trình đã bị xóa'
    });
  } catch (error) {
    next(error);
  }
}; 
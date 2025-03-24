const mongoose = require('mongoose');
const Garden = require('../models/Garden');
const Log = require('../models/Log');
const mqttService = require('../services/mqttService');

/**
 * @desc    Kiểm tra trạng thái stream
 * @route   GET /api/gardens/:id/stream/status
 * @access  Private
 */
exports.getStreamStatus = async (req, res, next) => {
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
    
    // Kiểm tra xem vườn có camera không
    if (!garden.has_camera) {
      return res.status(400).json({
        success: false,
        message: 'Vườn này không có camera'
      });
    }
    
    // Trả về trạng thái giả định (trong thực tế, trạng thái này nên được lưu trong cơ sở dữ liệu)
    // hoặc lấy từ cache/Redis
    res.status(200).json({
      success: true,
      data: {
        is_streaming: false,
        stream_url: null,
        last_active: null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bắt đầu stream video
 * @route   POST /api/gardens/:id/stream/start
 * @access  Private
 */
exports.startStream = async (req, res, next) => {
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
    
    // Kiểm tra xem vườn có camera không
    if (!garden.has_camera) {
      return res.status(400).json({
        success: false,
        message: 'Vườn này không có camera'
      });
    }
    
    // Gửi lệnh bắt đầu stream đến thiết bị
    await mqttService.controlStream(garden.device_serial, true);
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: 'Yêu cầu bắt đầu stream video được gửi bởi người dùng',
      source: 'USER'
    });
    
    // Trả về URL stream (giả định)
    // Trong thực tế, URL này có thể được tạo động dựa trên cấu hình của hệ thống
    res.status(200).json({
      success: true,
      message: 'Yêu cầu bắt đầu stream đã được gửi đến thiết bị',
      data: {
        stream_url: `wss://your-stream-server.com/garden/${garden.device_serial}/stream`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Dừng stream video
 * @route   POST /api/gardens/:id/stream/stop
 * @access  Private
 */
exports.stopStream = async (req, res, next) => {
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
    
    // Kiểm tra xem vườn có camera không
    if (!garden.has_camera) {
      return res.status(400).json({
        success: false,
        message: 'Vườn này không có camera'
      });
    }
    
    // Gửi lệnh dừng stream đến thiết bị
    await mqttService.controlStream(garden.device_serial, false);
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: 'Yêu cầu dừng stream video được gửi bởi người dùng',
      source: 'USER'
    });
    
    res.status(200).json({
      success: true,
      message: 'Yêu cầu dừng stream đã được gửi đến thiết bị'
    });
  } catch (error) {
    next(error);
  }
}; 
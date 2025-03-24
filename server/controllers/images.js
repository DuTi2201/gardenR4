const mongoose = require('mongoose');
const Garden = require('../models/Garden');
const Image = require('../models/Image');
const mqttService = require('../services/mqttService');

/**
 * @desc    Lấy danh sách hình ảnh của vườn
 * @route   GET /api/gardens/:id/images
 * @access  Private
 */
exports.getImages = async (req, res, next) => {
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
    
    // Lấy danh sách hình ảnh, sắp xếp theo thời gian mới nhất
    const images = await Image.find({ garden_id: garden._id })
      .sort({ timestamp: -1 })
      .limit(req.query.limit ? parseInt(req.query.limit) : 20);
    
    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết một hình ảnh
 * @route   GET /api/gardens/:id/images/:imageId
 * @access  Private
 */
exports.getImage = async (req, res, next) => {
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
    
    // Lấy thông tin hình ảnh
    const image = await Image.findOne({
      _id: req.params.imageId,
      garden_id: garden._id
    });
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hình ảnh với ID này'
      });
    }
    
    res.status(200).json({
      success: true,
      data: image
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Yêu cầu thiết bị chụp ảnh mới
 * @route   POST /api/gardens/:id/images/capture
 * @access  Private
 */
exports.captureImage = async (req, res, next) => {
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
    
    // Gửi lệnh chụp ảnh đến thiết bị
    await mqttService.takePhoto(garden.device_serial);
    
    res.status(200).json({
      success: true,
      message: 'Yêu cầu chụp ảnh đã được gửi đến thiết bị'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa một hình ảnh
 * @route   DELETE /api/gardens/:id/images/:imageId
 * @access  Private
 */
exports.deleteImage = async (req, res, next) => {
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
    
    // Xóa hình ảnh
    const result = await Image.deleteOne({
      _id: req.params.imageId,
      garden_id: garden._id
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hình ảnh với ID này'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Hình ảnh đã được xóa thành công'
    });
  } catch (error) {
    next(error);
  }
}; 
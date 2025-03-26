const mongoose = require('mongoose');
const Garden = require('../models/Garden');
const SensorData = require('../models/SensorData');

// Cache cho dữ liệu cảm biến
const sensorDataCache = new Map();
const CACHE_TTL = 30000; // 30 giây

/**
 * Cập nhật cache khi nhận dữ liệu cảm biến mới
 * @param {String} gardenId - ID của vườn
 * @param {Object} sensorData - Dữ liệu cảm biến mới
 */
exports.updateSensorDataCache = (gardenId, sensorData) => {
  const cacheKey = `sensor_${gardenId}`;
  sensorDataCache.set(cacheKey, {
    data: sensorData,
    timestamp: Date.now()
  });
  console.log(`Đã cập nhật cache dữ liệu cảm biến cho vườn ${gardenId}`);
};

/**
 * @desc    Lấy dữ liệu cảm biến mới nhất cho một vườn
 * @route   GET /api/gardens/:id/sensors
 * @access  Private
 */
exports.getSensorData = async (req, res, next) => {
  try {
    console.log('Xử lý yêu cầu lấy dữ liệu cảm biến');
    const gardenId = req.params.id;
    
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(gardenId)) {
      return res.status(400).json({
        success: false,
        message: 'ID vườn không hợp lệ'
      });
    }
    
    // Kiểm tra cache trước khi truy vấn DB
    const cacheKey = `sensor_${gardenId}`;
    const cachedData = sensorDataCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Trả về dữ liệu cảm biến từ cache cho vườn ${gardenId}`);
      return res.status(200).json({
        success: true,
        data: cachedData.data,
        fromCache: true
      });
    }
    
    // Tìm vườn trong database
    const garden = await Garden.findById(gardenId);
    
    if (!garden) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    if (req.user.role !== 'admin' && garden.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập vườn này'
      });
    }
    
    // Tìm dữ liệu cảm biến mới nhất cho vườn
    const sensorData = await SensorData.findOne({ garden_id: gardenId })
      .sort({ timestamp: -1 })
      .limit(1);
    
    // Lưu kết quả vào cache
    if (sensorData) {
      sensorDataCache.set(cacheKey, {
        data: sensorData,
        timestamp: Date.now()
      });
    }
    
    res.status(200).json({
      success: true,
      data: sensorData || null
    });
  } catch (error) {
    next(error);
  }
}; 
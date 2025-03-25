const mongoose = require('mongoose');
const Garden = require('../models/Garden');
const SensorData = require('../models/SensorData');

/**
 * @desc    Lấy dữ liệu cảm biến mới nhất của vườn
 * @route   GET /api/gardens/:id/data
 * @access  Private
 */
exports.getLatestSensorData = async (req, res, next) => {
  try {
    console.log('========= DEBUG SENSOR DATA REQUEST =========');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    console.log('Request params:', req.params);
    console.log('User ID:', req.user ? req.user._id : 'No user ID');
    console.log('User Role:', req.user ? req.user.role : 'No user role');
    console.log('============================================');
    
    // Lấy ID vườn từ params
    const gardenId = req.params.id;
    console.log(`Đang lấy dữ liệu cảm biến cho vườn ID: ${gardenId}`);
    
    if (!mongoose.Types.ObjectId.isValid(gardenId)) {
      console.log(`Garden ID không hợp lệ: ${gardenId}`);
      return res.status(400).json({
        success: false,
        message: 'ID vườn không hợp lệ'
      });
    }
    
    const garden = await Garden.findById(gardenId);
    
    if (!garden) {
      console.log(`Không tìm thấy vườn với ID: ${gardenId}`);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy vườn với ID này'
      });
    }
    
    console.log(`Đã tìm thấy vườn: ${garden.name}, thuộc về user: ${garden.user_id}`);
    
    // Kiểm tra xem người dùng có quyền truy cập vườn này không
    // Skip kiểm tra quyền nếu người dùng là admin
    if (req.user.role !== 'admin' && garden.user_id.toString() !== req.user._id.toString()) {
      console.log(`Người dùng ${req.user._id} không có quyền truy cập vườn ${garden._id} (thuộc về ${garden.user_id})`);
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập vườn này'
      });
    }
    
    // Lấy dữ liệu cảm biến mới nhất
    const latestSensorData = await SensorData.findOne({ garden_id: garden._id })
      .sort({ timestamp: -1 });
    
    if (!latestSensorData) {
      console.log(`Không có dữ liệu cảm biến cho vườn ID: ${gardenId}`);
      
      // Trả về lỗi khi không tìm thấy dữ liệu
      return res.status(404).json({
        success: false,
        message: 'Chưa có dữ liệu cảm biến nào cho vườn này',
        error: 'NO_SENSOR_DATA'
      });
    }
    
    console.log(`Đã tìm thấy dữ liệu cảm biến thực cho vườn ID: ${gardenId}`);
    res.status(200).json({
      success: true,
      data: {
        garden,
        latestSensorData
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu cảm biến:', error);
    next(error);
  }
};

/**
 * @desc    Lấy lịch sử dữ liệu cảm biến của vườn
 * @route   GET /api/gardens/:id/data/history
 * @access  Private
 */
exports.getSensorDataHistory = async (req, res, next) => {
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
    
    // Lấy các thông số truy vấn
    const limit = parseInt(req.query.limit) || 24; // Mặc định 24 mẫu
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    
    // Tạo điều kiện truy vấn
    const query = { garden_id: garden._id };
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = from;
      if (to) query.timestamp.$lte = to;
    }
    
    // Lấy lịch sử dữ liệu cảm biến, sắp xếp theo thời gian
    // Tùy thuộc vào khoảng thời gian, chúng ta có thể cần phải tính toán trung bình
    // để giảm số lượng dữ liệu trả về
    const sensorData = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: sensorData.length,
      data: sensorData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thống kê dữ liệu cảm biến theo ngày
 * @route   GET /api/gardens/:id/data/stats
 * @access  Private
 */
exports.getSensorDataStats = async (req, res, next) => {
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
    
    // Lấy các thông số truy vấn
    const days = parseInt(req.query.days) || 7; // Mặc định 7 ngày
    
    // Tính ngày bắt đầu
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    // Tính ngày kết thúc (hiện tại)
    const endDate = new Date();
    
    // Tính toán thống kê dữ liệu cảm biến theo ngày
    const sensorStats = await SensorData.aggregate([
      {
        $match: {
          garden_id: mongoose.Types.ObjectId(garden._id),
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" }
          },
          date: { $first: "$timestamp" },
          avgTemperature: { $avg: "$temperature" },
          minTemperature: { $min: "$temperature" },
          maxTemperature: { $max: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          minHumidity: { $min: "$humidity" },
          maxHumidity: { $max: "$humidity" },
          avgLight: { $avg: "$light" },
          minLight: { $min: "$light" },
          maxLight: { $max: "$light" },
          avgSoil: { $avg: "$soil" },
          minSoil: { $min: "$soil" },
          maxSoil: { $max: "$soil" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      count: sensorStats.length,
      data: sensorStats
    });
  } catch (error) {
    next(error);
  }
}; 
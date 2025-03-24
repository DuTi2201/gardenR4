const mongoose = require('mongoose');
const Log = require('../models/Log');
const Garden = require('../models/Garden');

/**
 * @desc    Lấy danh sách logs của khu vườn
 * @route   GET /api/gardens/:gardenId/logs
 * @access  Private
 */
exports.getGardenLogs = async (req, res, next) => {
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

    // Lấy các thông số truy vấn
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const level = req.query.level || null;
    
    // Tạo điều kiện truy vấn
    const query = { garden_id: gardenId };
    
    if (startDate && endDate) {
      query.timestamp = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.timestamp = { $gte: startDate };
    } else if (endDate) {
      query.timestamp = { $lte: endDate };
    }
    
    if (level) {
      query.level = level;
    }
    
    // Lấy số lượng logs
    const total = await Log.countDocuments(query);
    
    // Lấy danh sách logs, sắp xếp theo thời gian mới nhất
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit)
      },
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết một log
 * @route   GET /api/logs/:id
 * @access  Private
 */
exports.getLog = async (req, res, next) => {
  try {
    const log = await Log.findById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy log với ID này'
      });
    }
    
    // Kiểm tra quyền truy cập
    const garden = await Garden.findById(log.garden_id);
    if (!garden || garden.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập log này'
      });
    }
    
    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tổng quan về logs của khu vườn
 * @route   GET /api/gardens/:gardenId/logs/summary
 * @access  Private
 */
exports.getLogsSummary = async (req, res, next) => {
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

    // Lấy các thông số truy vấn
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Lấy số lượng logs theo level
    const logsByLevel = await Log.aggregate([
      {
        $match: {
          garden_id: mongoose.Types.ObjectId(gardenId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Lấy số lượng logs theo ngày
    const logsByDay = await Log.aggregate([
      {
        $match: {
          garden_id: mongoose.Types.ObjectId(gardenId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Định dạng kết quả
    const summary = {
      byLevel: logsByLevel.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byDay: logsByDay.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
}; 
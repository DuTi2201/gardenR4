const mongoose = require('mongoose');
const Notification = require('../models/Notification');

/**
 * @desc    Lấy danh sách thông báo của người dùng
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = async (req, res, next) => {
  try {
    // Lấy các thông số truy vấn
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const read = req.query.read === 'true' ? true : (req.query.read === 'false' ? false : null);
    
    // Tạo điều kiện truy vấn
    const query = { user_id: req.user._id };
    
    if (read !== null) {
      query.read = read;
    }
    
    // Lấy số lượng thông báo
    const total = await Notification.countDocuments(query);
    
    // Lấy danh sách thông báo, sắp xếp theo thời gian mới nhất
    const notifications = await Notification.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit)
      },
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đánh dấu một thông báo đã đọc
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo với ID này'
      });
    }
    
    // Đã đọc rồi
    if (notification.read) {
      return res.status(200).json({
        success: true,
        message: 'Thông báo đã được đánh dấu là đã đọc từ trước',
        data: notification
      });
    }
    
    // Đánh dấu là đã đọc
    notification.read = true;
    await notification.save();
    
    res.status(200).json({
      success: true,
      message: 'Thông báo đã được đánh dấu là đã đọc',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đánh dấu tất cả thông báo đã đọc
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    // Cập nhật tất cả thông báo chưa đọc
    const result = await Notification.updateMany(
      { user_id: req.user._id, read: false },
      { read: true }
    );
    
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} thông báo đã được đánh dấu là đã đọc`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa một thông báo
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const result = await Notification.deleteOne({
      _id: req.params.id,
      user_id: req.user._id
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo với ID này'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Thông báo đã được xóa thành công'
    });
  } catch (error) {
    next(error);
  }
}; 
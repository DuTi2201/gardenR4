const User = require('../models/User');
const Garden = require('../models/Garden');
const DeviceSerial = require('../models/DeviceSerial');
const Notification = require('../models/Notification');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

/**
 * @desc    Lấy danh sách tất cả các user
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort('-created_at');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thông tin chi tiết của một user
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return next(
        new ErrorResponse(`Không tìm thấy người dùng với id ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật quyền của user
 * @route   PUT /api/admin/users/:id/role
 * @access  Private/Admin
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    console.log(`Đang thay đổi quyền cho người dùng ID: ${req.params.id}`);
    console.log('Request body:', req.body);
    
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      console.log(`Quyền không hợp lệ: ${role}`);
      return next(
        new ErrorResponse('Vui lòng cung cấp quyền hợp lệ (user hoặc admin)', 400)
      );
    }

    // Không cho phép admin thay đổi quyền của chính mình
    if (req.params.id.toString() === req.user._id.toString()) {
      console.log('Admin không thể thay đổi quyền của chính mình');
      return next(
        new ErrorResponse('Bạn không thể thay đổi quyền của chính mình', 400)
      );
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log(`Không tìm thấy người dùng với id ${req.params.id}`);
      return next(
        new ErrorResponse(`Không tìm thấy người dùng với id ${req.params.id}`, 404)
      );
    }

    console.log(`Đã thay đổi quyền của ${user.fullname} thành ${user.role}`);

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Lỗi cập nhật quyền:', error);
    next(error);
  }
};

/**
 * @desc    Lấy thống kê tổng quan
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
exports.getDashboard = async (req, res, next) => {
  try {
    console.log("getDashboard API called by:", req.user.email);
    console.log("User role:", req.user.role);
    
    // Thực hiện các truy vấn đồng thời để tăng hiệu suất
    console.log("Starting database queries...");
    const [totalUsers, totalGardens, totalDeviceSerials, activatedDevices] = await Promise.all([
      User.countDocuments(),
      Garden.countDocuments(),
      DeviceSerial.countDocuments(),
      DeviceSerial.countDocuments({ is_activated: true })
    ]);
    
    console.log("Database queries completed");
    console.log("Totals:", { totalUsers, totalGardens, totalDeviceSerials, activatedDevices });
    
    const inactiveDevices = totalDeviceSerials - activatedDevices;

    // Thống kê người dùng và vườn mới trong 7 ngày qua
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    console.log("Querying data for the last week since:", lastWeek);
    const [newUsers, newGardens] = await Promise.all([
      User.countDocuments({ created_at: { $gte: lastWeek } }),
      Garden.countDocuments({ created_at: { $gte: lastWeek } })
    ]);
    console.log("Last week data:", { newUsers, newGardens });

    const dashboardData = {
      totalUsers,
      totalGardens,
      totalDeviceSerials,
      activatedDevices,
      inactiveDevices,
      newUsers,
      newGardens
    };
    
    console.log("Final dashboard data:", dashboardData);
    console.log("Sending response...");

    return res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error in getDashboard:', error);
    return next(error);
  }
};

/**
 * @desc    Lấy danh sách vườn của một user
 * @route   GET /api/admin/users/:id/gardens
 * @access  Private/Admin
 */
exports.getUserGardens = async (req, res, next) => {
  try {
    const gardens = await Garden.find({ user_id: req.params.id });

    if (!gardens) {
      return next(
        new ErrorResponse(`Không tìm thấy vườn nào cho người dùng với id ${req.params.id}`, 404)
      );
    }

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
 * @desc    Debug API để kiểm tra route admin
 * @route   GET /api/admin/debug
 * @access  Private/Admin
 */
exports.debugApi = async (req, res, next) => {
  try {
    // Thống kê các mô hình có sẵn
    const models = Object.keys(mongoose.models).sort();
    
    return res.status(200).json({
      success: true,
      message: 'Admin API debug route is working',
      user: req.user,
      models: models,
      time: new Date()
    });
  } catch (error) {
    console.error('Error in debugApi:', error);
    return next(error);
  }
};

/**
 * @desc    Lấy tất cả vườn trong hệ thống
 * @route   GET /api/admin/gardens
 * @access  Private/Admin
 */
exports.getAllGardens = async (req, res, next) => {
  try {
    console.log("getAllGardens API called by:", req.user.email);
    
    const gardens = await Garden.find()
      .sort('-created_at')
      .populate('user_id', 'email fullname');
    
    // Định dạng lại dữ liệu cho frontend
    const formattedGardens = gardens.map(garden => ({
      _id: garden._id,
      name: garden.name,
      location: garden.location,
      device_serial: garden.device_serial,
      user_id: garden.user_id._id,
      user_email: garden.user_id.email,
      user_fullname: garden.user_id.fullname,
      is_active: garden.is_active,
      created_at: garden.created_at,
      updated_at: garden.updated_at
    }));
    
    console.log(`Found ${formattedGardens.length} gardens`);
    
    res.status(200).json({
      success: true,
      count: formattedGardens.length,
      data: formattedGardens
    });
  } catch (error) {
    console.error('Error in getAllGardens:', error);
    next(error);
  }
};

/**
 * @desc    Xóa một người dùng
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    console.log(`Đang xử lý xóa người dùng với ID: ${req.params.id} bởi admin: ${req.user.email}`);
    
    // Không cho phép admin xóa chính mình
    if (req.params.id.toString() === req.user._id.toString()) {
      console.log('Admin không thể xóa chính mình');
      return next(
        new ErrorResponse('Bạn không thể xóa tài khoản của chính mình', 400)
      );
    }

    // Tìm user để xóa
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log(`Không tìm thấy người dùng với id ${req.params.id}`);
      return next(
        new ErrorResponse(`Không tìm thấy người dùng với id ${req.params.id}`, 404)
      );
    }

    console.log(`Tìm thấy người dùng: ${user.fullname}`);

    // Xóa các vườn liên quan đến user
    const deletedGardens = await Garden.deleteMany({ user_id: req.params.id });
    console.log(`Đã xóa ${deletedGardens.deletedCount} vườn của người dùng`);

    // Xóa các thông báo liên quan đến user
    const deletedNotifications = await Notification.deleteMany({ user_id: req.params.id });
    console.log(`Đã xóa ${deletedNotifications.deletedCount} thông báo của người dùng`);

    // Xóa user
    await User.findByIdAndDelete(req.params.id);
    console.log(`Đã xóa người dùng ${user.fullname}`);

    return res.status(200).json({
      success: true,
      message: `Đã xóa người dùng ${user.fullname} và dữ liệu liên quan`
    });
  } catch (error) {
    console.error('Lỗi xóa người dùng:', error);
    next(error);
  }
};

/**
 * @desc    Gửi thông báo cho người dùng
 * @route   POST /api/admin/notifications/send
 * @access  Private/Admin
 */
exports.sendNotification = async (req, res, next) => {
  try {
    const { userId, title, message, sendEmail, emailFrom } = req.body;

    if (!userId || !title || !message) {
      return next(
        new ErrorResponse('Vui lòng cung cấp đầy đủ thông tin userId, title và message', 400)
      );
    }

    // Kiểm tra người dùng tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return next(
        new ErrorResponse(`Không tìm thấy người dùng với id ${userId}`, 404)
      );
    }

    // Tạo thông báo trong hệ thống
    const notification = new Notification({
      user_id: userId,
      title,
      message,
      type: 'ADMIN',
      timestamp: new Date()
    });

    await notification.save();

    // Gửi email nếu được yêu cầu
    if (sendEmail && user.email) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailFrom || 'greenaigarden@gmail.com',
            pass: process.env.EMAIL_PASSWORD
          }
        });

        const mailOptions = {
          from: emailFrom || 'greenaigarden@gmail.com',
          to: user.email,
          subject: title,
          text: message,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                   <h2 style="color: #4caf50;">${title}</h2>
                   <p>${message}</p>
                   <hr>
                   <p style="font-size: 12px; color: #666;">Thông báo này được gửi từ hệ thống Smart Garden.</p>
                 </div>`
        };

        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Lỗi khi gửi email:', emailError);
        // Không return lỗi, vẫn tiếp tục với thông báo trong hệ thống
      }
    }

    res.status(201).json({
      success: true,
      message: `Đã gửi thông báo đến ${user.fullname}`,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Gửi thông báo cho nhiều người dùng
 * @route   POST /api/admin/notifications/bulk-send
 * @access  Private/Admin
 */
exports.sendBulkNotification = async (req, res, next) => {
  try {
    const { userIds, title, message, sendEmail, emailFrom } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !title || !message) {
      return next(
        new ErrorResponse('Vui lòng cung cấp đầy đủ thông tin userIds, title và message', 400)
      );
    }

    // Kiểm tra userIds hợp lệ
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length === 0) {
      return next(
        new ErrorResponse('Không tìm thấy người dùng nào hợp lệ trong danh sách đã chọn', 404)
      );
    }

    // Tạo các thông báo trong hệ thống
    const notifications = [];
    for (const user of users) {
      const notification = new Notification({
        user_id: user._id,
        title,
        message,
        type: 'ADMIN',
        timestamp: new Date()
      });

      await notification.save();
      notifications.push(notification);
    }

    // Phần gửi email tạm thời bị bỏ qua do thiếu cấu hình
    console.log(`Thông báo đã được gửi đến ${users.length} người dùng, nhưng email không được gửi do thiếu cấu hình`);

    res.status(201).json({
      success: true,
      message: `Đã gửi thông báo đến ${users.length} người dùng`,
      data: {
        sentTo: users.length,
        notifications: notifications.length
      }
    });
  } catch (error) {
    console.error('Lỗi khi gửi thông báo hàng loạt:', error);
    next(error);
  }
}; 
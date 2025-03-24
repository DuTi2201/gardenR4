const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware để xác thực token từ người dùng
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Lấy token từ header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không tìm thấy token xác thực'
      });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Tìm kiếm người dùng
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Người dùng không tồn tại'
      });
    }
    
    // Gán thông tin người dùng vào request
    req.user = user;
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }
};

// Bảo vệ routes
exports.protect = async (req, res, next) => {
  let token;

  // Kiểm tra xem header có authorization không
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Lấy token từ header
    token = req.headers.authorization.split(' ')[1];
  }

  // Kiểm tra xem token có tồn tại không
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không được phép truy cập, không có token'
    });
  }

  try {
    // Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lấy thông tin người dùng và gán vào req.user
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy người dùng với token này'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Không được phép truy cập, token không hợp lệ'
    });
  }
};

// Cấp quyền vai trò
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Vai trò ${req.user.role} không được phép truy cập tài nguyên này`
      });
    }
    next();
  };
}; 
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
  console.log('Protect middleware running...');

  // Kiểm tra xem header có authorization không
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Lấy token từ header
    token = req.headers.authorization.split(' ')[1];
    console.log('Token found in header:', token ? token.substring(0, 15) + '...' : 'none');
  }

  // Kiểm tra xem token có tồn tại không
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({
      success: false,
      message: 'Không được phép truy cập, không có token'
    });
  }

  try {
    // Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified, user ID:', decoded.id);

    // Lấy thông tin người dùng và gán vào req.user
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      console.log('User not found with token');
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy người dùng với token này'
      });
    }
    console.log('User role:', req.user.role);

    next();
  } catch (error) {
    console.log('Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Không được phép truy cập, token không hợp lệ'
    });
  }
};

// Cấp quyền vai trò
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware running for roles:', roles);
    console.log('User:', req.user ? `${req.user.email} (${req.user.role})` : 'No user');
    
    // Trường hợp đặc biệt cho tài khoản admin@smartgarden.com
    if (req.user.email === 'admin@smartgarden.com') {
      console.log('Admin access granted by email:', req.user.email);
      return next();
    }
    
    if (!req.user.role || !roles.includes(req.user.role)) {
      console.log('Access denied - user role:', req.user.role, 'required roles:', roles);
      return res.status(403).json({
        success: false,
        message: `Vai trò ${req.user.role || 'không xác định'} không được phép truy cập tài nguyên này`
      });
    }
    
    console.log('Access granted');
    next();
  };
}; 
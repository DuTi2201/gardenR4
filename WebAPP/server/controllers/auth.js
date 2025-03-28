const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * @desc    Đăng ký người dùng mới
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, fullname } = req.body;

    // Kiểm tra xem email đã tồn tại chưa
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // Tạo người dùng mới
    const user = await User.create({
      email,
      password,
      fullname
    });

    // Gửi token đăng nhập
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đăng nhập người dùng
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }

    // Check for user (lấy cả password để đối chiếu)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng với email này'
      });
    }

    // Check if password matches using method from model
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không đúng'
      });
    }

    // Update last login time
    user.last_login = Date.now();
    await user.save();

    // Create token
    const token = user.getSignedJwtToken();

    // Gán role cho admin
    let userRole = email === 'admin@smartgarden.com' ? 'admin' : (user.role || 'user');
    
    console.log('User login info:', {
      id: user._id,
      email: user.email,
      original_role: user.role,
      assigned_role: userRole
    });

    // Return success response with token and user data
    const response = {
      success: true,
      token: token,
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        role: userRole,  // Gán role
        avatar: user.avatar,
        created_at: user.created_at,
        last_login: user.last_login
      }
    };
    
    console.log('Final response:', response);
    
    return res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi máy chủ'
    });
  }
};

/**
 * @desc    Lấy thông tin người dùng đang đăng nhập
 * @route   GET /api/auth/profile
 * @access  Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    // req.user đã được đặt bởi middleware auth
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật thông tin người dùng
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullname, avatar } = req.body;
    
    // Chỉ cho phép cập nhật những trường nhất định
    const fieldsToUpdate = {};
    if (fullname) fieldsToUpdate.fullname = fullname;
    if (avatar) fieldsToUpdate.avatar = avatar;
    
    // Cập nhật thông tin người dùng
    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Đổi mật khẩu
 * @route   PUT /api/auth/password
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Tìm người dùng theo ID và lấy cả password
    const user = await User.findById(req.user.id).select('+password');
    
    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }
    
    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();
    
    // Gửi token mới
    const token = user.getSignedJwtToken();res.status(200).json({success: true, token, user: {id: user._id, email: user.email, fullname: user.fullname, role: user.role, avatar: user.avatar, created_at: user.created_at, last_login: user.last_login}});
  } catch (error) {
    next(error);
  }
};

/**
 * Tạo và gửi token JWT trong cookie
 * @param {Object} user - Đối tượng người dùng
 * @param {Number} statusCode - Mã HTTP trả về
 * @param {Object} res - Response object
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Tạo token
  const token = user.getSignedJwtToken();

  // Dữ liệu user để trả về
  const userData = {
    id: user._id,
    email: user.email,
    fullname: user.fullname,
    role: user.role, // Đảm bảo gửi role
    avatar: user.avatar,
    created_at: user.created_at,
    last_login: user.last_login
  };

  // Log để debug
  console.log('User data being sent:', userData);

  res.status(statusCode).json({
    success: true,
    token,
    user: userData
  });
}; 
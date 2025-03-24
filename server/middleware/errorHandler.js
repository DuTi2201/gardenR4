/**
 * Middleware xử lý lỗi
 * @param {Error} err Error object
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @param {Function} next Next middleware function
 */
exports.errorHandler = (err, req, res, next) => {
  // Ghi log lỗi vào console
  console.error(err.stack);

  // Mã lỗi mặc định 500 (Lỗi máy chủ)
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Lỗi máy chủ';
  
  // Xử lý lỗi CastError của Mongoose (Invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Mã định danh tài nguyên không hợp lệ';
  }
  
  // Xử lý lỗi ValidationError của Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }
  
  // Xử lý lỗi trùng lặp của Mongoose (duplicate key)
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Giá trị đã tồn tại trong hệ thống';
    
    // Thông tin chi tiết về trường bị trùng
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} đã được sử dụng`;
  }
  
  // Xử lý lỗi JsonWebTokenError
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token không hợp lệ';
  }
  
  // Xử lý lỗi TokenExpiredError
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token đã hết hạn';
  }
  
  // Gửi phản hồi lỗi 
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
}; 
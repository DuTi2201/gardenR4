/**
 * Middleware xử lý lỗi
 * @param {Error} err Error object
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @param {Function} next Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Không tìm thấy tài nguyên';
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Dữ liệu đã tồn tại';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  res.status(error.statusCode || err.statusCode || 500).json({
    success: false,
    message: error.message || err.message || 'Lỗi server'
  });
};

module.exports = { errorHandler }; 
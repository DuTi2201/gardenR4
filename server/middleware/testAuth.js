const testProtect = (req, res, next) => {
  // Middleware xác thực đơn giản
  // Không kiểm tra token, luôn cho phép truy cập
  // CHỈ SỬ DỤNG CHO MỤC ĐÍCH THỬ NGHIỆM
  
  // Thiết lập user giả lập
  req.user = {
    _id: '6574a0000000000000000001',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user'
  };
  
  console.log('Test authentication applied');
  next();
};

module.exports = { testProtect }; 
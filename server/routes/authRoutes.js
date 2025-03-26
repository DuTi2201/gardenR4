const express = require('express');
const {
  register,
  login,
  getProfile,
  updateProfile,
  updatePassword
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Routes không cần xác thực
router.post('/register', register);
router.post('/login', login);

// Bảo vệ routes phía dưới
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

module.exports = router;

 
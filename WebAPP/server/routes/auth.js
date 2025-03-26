const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
  updatePassword
} = require('../controllers/auth');

const { verifyToken } = require('../middleware/auth');

// Các routes không cần xác thực
router.post('/register', register);
router.post('/login', login);

// Các routes cần xác thực
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/password', verifyToken, updatePassword);

module.exports = router; 
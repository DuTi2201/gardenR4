const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  getGardens,
  createGarden,
  getGarden,
  updateGarden,
  deleteGarden,
  verifyDeviceSerial,
  updateGardenSettings
} = require('../controllers/gardens');

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

// Các routes cơ bản cho vườn
router.route('/')
  .get(getGardens)
  .post(createGarden);

// Route kiểm tra device serial
router.post('/verify', verifyDeviceSerial);

// Routes cho vườn cụ thể
router.route('/:id')
  .get(getGarden)
  .put(updateGarden)
  .delete(deleteGarden);

// Route cập nhật cài đặt vườn
router.put('/:id/settings', updateGardenSettings);

module.exports = router; 
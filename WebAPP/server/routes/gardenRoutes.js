const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { testProtect } = require('../middleware/testAuth');
const mqttService = require('../services/mqttService');

const {
  getGardens,
  createGarden,
  getGarden,
  updateGarden,
  deleteGarden,
  verifyDeviceSerial,
  updateThresholds
} = require('../controllers/gardens');

// Import device router
const { gardenDeviceRouter } = require('./deviceRoutes');

// Import applySuggestions controller từ analysis controller
const { applySuggestions } = require('../controllers/analysis');

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

// Các routes cơ bản cho vườn
router.route('/')
  .get(getGardens)
  .post(createGarden);

// Route kiểm tra device serial
router.post('/verify', verifyDeviceSerial);

// Route test MQTT sử dụng testProtect
router.post('/test-mqtt-simple', testProtect, async (req, res) => {
  try {
    const { deviceSerial, device, state } = req.body;
    
    if (!deviceSerial || !device || state === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin deviceSerial, device và state'
      });
    }
    
    // Gửi lệnh MQTT
    await mqttService.sendCommand(deviceSerial, device, state, req.user);
    
    res.status(200).json({
      success: true,
      message: `Đã gửi lệnh ${state ? 'BẬT' : 'TẮT'} ${device} cho thiết bị ${deviceSerial}`
    });
  } catch (error) {
    console.error('Lỗi gửi lệnh MQTT:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi gửi lệnh MQTT'
    });
  }
});

// Routes cho vườn cụ thể
router.route('/:id')
  .get(getGarden)
  .put(updateGarden)
  .delete(deleteGarden);

// Route cập nhật cài đặt vườn
router.route('/:id/thresholds')
  .put(updateThresholds);

// Gắn router thiết bị vào garden router
router.use('/:id/devices', gardenDeviceRouter);

// Route bật/tắt chế độ tự động
router.post('/:id/auto-mode', require('../controllers/devices').toggleAutoMode);

// Route áp dụng đề xuất vào lịch trình
router.post('/:id/apply-suggestions', applySuggestions);

module.exports = router; 
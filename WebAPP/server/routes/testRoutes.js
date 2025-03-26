const express = require('express');
const { 
  createTestNotification 
} = require('../controllers/notifications');
const { testProtect } = require('../middleware/testAuth');
const mqttService = require('../services/mqttService');

const router = express.Router();

// Áp dụng middleware xác thực đơn giản cho tất cả routes
router.use(testProtect);

// Route tạo thông báo test
router.post('/notification', createTestNotification);

// Route test MQTT
router.post('/mqtt', async (req, res) => {
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

module.exports = router; 
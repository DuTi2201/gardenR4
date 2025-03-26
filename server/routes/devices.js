const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  getDevicesStatus,
  controlDevice,
  syncDevices,
  getDeviceHistory
} = require('../controllers/devices');

// Lấy trạng thái các thiết bị
router.get('/', getDevicesStatus);

// Lấy lịch sử điều khiển
router.get('/history', getDeviceHistory);

// Đồng bộ thiết bị
router.post('/sync', syncDevices);

// Điều khiển thiết bị cụ thể
router.post('/:device/control', controlDevice);

module.exports = router; 
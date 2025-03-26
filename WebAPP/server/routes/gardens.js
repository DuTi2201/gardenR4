const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const gardensController = require('../controllers/gardens');
const devicesController = require('../controllers/devices');
const sensorController = require('../controllers/sensors');
const imagesController = require('../controllers/images');

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

// Các routes cơ bản cho vườn
router.route('/')
  .get(gardensController.getGardens)
  .post(gardensController.createGarden);

// Route kiểm tra device serial
router.post('/verify', gardensController.verifyDeviceSerial);

// Routes cho vườn cụ thể
router.route('/:id')
  .get(gardensController.getGarden)
  .put(gardensController.updateGarden)
  .delete(gardensController.deleteGarden);

// Route cập nhật cài đặt vườn
router.put('/:id/settings', gardensController.updateGardenSettings);

// Sensor data
router.get('/:id/sensors', sensorController.getSensorData);
router.get('/:id/sensors/history', sensorController.getSensorHistory);

// Device control
router.get('/:id/devices', devicesController.getDevices);
router.post('/:id/devices', devicesController.addDevice);
router.post('/:id/devices/control', devicesController.controlDevice);
router.get('/:id/devices/history', devicesController.getDeviceHistory);
router.post('/:id/auto-mode', devicesController.toggleAutoMode);

// Schedules
router.get('/:id/schedules', devicesController.getSchedules);
router.post('/:id/schedules', devicesController.createSchedule);
router.put('/:id/schedules/:scheduleId', devicesController.updateSchedule);
router.delete('/:id/schedules/:scheduleId', devicesController.deleteSchedule);

// Images
router.get('/:id/images', imagesController.getGardenImages);
router.post('/:id/images', imagesController.uploadImage);
router.get('/:id/images/:imageId', imagesController.getImageById);
router.delete('/:id/images/:imageId', imagesController.deleteImage);

// Camera endpoints
router.post('/camera/:deviceSerial/capture', gardensController.captureImage);
router.post('/camera/:deviceSerial/stream', gardensController.controlStream);

module.exports = router; 
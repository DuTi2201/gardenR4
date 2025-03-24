const express = require('express');
const { 
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  controlDevice,
  getDeviceHistory
} = require('../controllers/devices');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

// Routes cho thiết bị trong context của garden
router.route('/')
  .get(getDevices)
  .post(createDevice);

// Router riêng cho các thao tác trên thiết bị cụ thể
const deviceRouter = express.Router();

deviceRouter.use(protect);

deviceRouter.route('/:id')
  .get(getDevice)
  .put(updateDevice)
  .delete(deleteDevice);

deviceRouter.route('/:id/control')
  .post(controlDevice);

deviceRouter.route('/:id/history')
  .get(getDeviceHistory);

module.exports = {
  gardenDeviceRouter: router,
  deviceRouter
}; 
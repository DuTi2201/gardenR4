const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import controllers
const {
  getAllUsers,
  getUser,
  updateUserRole,
  getDashboard,
  getUserGardens,
  debugApi,
  getAllGardens,
  deleteUser,
  sendNotification,
  sendBulkNotification
} = require('../controllers/admin');

const {
  getDeviceSerials,
  getDeviceSerial,
  createDeviceSerial,
  updateDeviceSerial,
  deleteDeviceSerial,
  createDeviceSerialBatch,
  getDeviceSerialUser
} = require('../controllers/deviceSerials');

// Áp dụng middleware bảo vệ và phân quyền cho tất cả các routes
router.use(protect);
router.use(authorize('admin'));

// Dashboard routes
router.get('/dashboard', getDashboard);

// Garden routes
router.get('/gardens', getAllGardens);

// User routes
router.get('/users', getAllUsers);

// Nhóm các routes theo resource user
router.route('/users/:id')
  .get(getUser)
  .put(updateUserRole) // Thay đổi lại để phù hợp với REST API
  .delete(deleteUser);  // Route đúng chuẩn REST API

// Route riêng cho thay đổi quyền (giữ lại để tương thích với code hiện tại)
router.put('/users/:id/role', updateUserRole);

router.get('/users/:id/gardens', getUserGardens);

// Notification routes
router.post('/notifications/send', sendNotification);
router.post('/notifications/bulk-send', sendBulkNotification);

// Device serial routes
router.route('/device-serials')
  .get(getDeviceSerials)
  .post(createDeviceSerial);

router.post('/device-serials/batch', createDeviceSerialBatch);

router.route('/device-serials/:id')
  .get(getDeviceSerial)
  .put(updateDeviceSerial)
  .delete(deleteDeviceSerial);

router.get('/device-serials/:id/user', getDeviceSerialUser);

// Debug route để kiểm tra thông tin admin API
router.get('/debug', debugApi);

module.exports = router; 
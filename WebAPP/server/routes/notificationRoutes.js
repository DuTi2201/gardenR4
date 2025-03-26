const express = require('express');
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  createTestNotification
} = require('../controllers/notifications');
const { protect } = require('../middleware/auth');
const { testProtect } = require('../middleware/testAuth');

const router = express.Router();

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

router.route('/')
  .get(getNotifications);

router.route('/read-all')
  .put(markAllAsRead);

// Route thử nghiệm với middleware xác thực đơn giản
// Sử dụng .use() để thay thế middleware bảo vệ mặc định cho route này
router.route('/test')
  .all((req, res, next) => {
    router.use(testProtect);
    next();
  })
  .post(createTestNotification);

router.route('/:id/read')
  .put(markAsRead);

router.route('/:id')
  .delete(deleteNotification);

module.exports = router; 
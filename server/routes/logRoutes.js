const express = require('express');
const { 
  getGardenLogs,
  getLog,
  getLogsSummary
} = require('../controllers/logs');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

// Routes cụ thể cho garden logs
router.route('/')
  .get(getGardenLogs);

router.route('/summary')
  .get(getLogsSummary);

// Cũng định nghĩa một router riêng cho logs (không mergeParams)
const logRouter = express.Router();

logRouter.use(protect);

logRouter.route('/:id')
  .get(getLog);

module.exports = {
  gardenLogRouter: router,
  logRouter
}; 
const express = require('express');
const { 
  getLatestSensorData,
  getSensorDataHistory,
  getSensorDataStats
} = require('../controllers/sensorData');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

router.route('/')
  .get(getLatestSensorData);

router.route('/history')
  .get(getSensorDataHistory);

router.route('/stats')
  .get(getSensorDataStats);

module.exports = router; 
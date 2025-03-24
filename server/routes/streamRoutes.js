const express = require('express');
const { 
  getStreamStatus,
  startStream,
  stopStream
} = require('../controllers/stream');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

router.route('/')
  .get(getStreamStatus);

router.route('/start')
  .post(startStream);

router.route('/stop')
  .post(stopStream);

module.exports = router; 
const express = require('express');
const router = express.Router({ mergeParams: true });

// Giả định controller sẽ được tạo sau
const streamController = {
  startStream: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Yêu cầu bắt đầu stream đã được gửi đến thiết bị'
    });
  },
  stopStream: (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Yêu cầu dừng stream đã được gửi đến thiết bị'
    });
  }
};

// Routes
router.post('/start', streamController.startStream);
router.post('/stop', streamController.stopStream);

module.exports = router; 
const express = require('express');
const router = express.Router();

// Giả định controller sẽ được tạo sau
const notificationsController = {
  getNotifications: (req, res) => {
    res.status(200).json({
      success: true,
      data: []
    });
  },
  markAsRead: (req, res) => {
    res.status(200).json({
      success: true,
      data: {}
    });
  }
};

// Routes
router.get('/', notificationsController.getNotifications);
router.put('/:id/read', notificationsController.markAsRead);

module.exports = router; 
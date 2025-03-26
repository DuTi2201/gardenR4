const express = require('express');
const router = express.Router({ mergeParams: true });

// Giả định controller sẽ được tạo sau
const schedulesController = {
  getSchedules: (req, res) => {
    res.status(200).json({
      success: true,
      data: []
    });
  },
  createSchedule: (req, res) => {
    res.status(201).json({
      success: true,
      data: {}
    });
  }
};

// Routes
router.route('/')
  .get(schedulesController.getSchedules)
  .post(schedulesController.createSchedule);

module.exports = router; 
const express = require('express');
const router = express.Router({ mergeParams: true });

// Giả định controller sẽ được tạo sau
const sensorDataController = {
  getSensorData: (req, res) => {
    res.status(200).json({
      success: true,
      data: []
    });
  },
  getLatestSensorData: (req, res) => {
    res.status(200).json({
      success: true,
      data: {}
    });
  }
};

// Routes
router.get('/', sensorDataController.getSensorData);
router.get('/latest', sensorDataController.getLatestSensorData);

module.exports = router; 
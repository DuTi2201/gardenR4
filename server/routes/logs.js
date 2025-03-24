const express = require('express');
const router = express.Router({ mergeParams: true });

// Giả định controller sẽ được tạo sau
const logsController = {
  getLogs: (req, res) => {
    res.status(200).json({
      success: true,
      data: []
    });
  }
};

// Routes
router.get('/', logsController.getLogs);

module.exports = router; 
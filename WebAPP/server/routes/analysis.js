const express = require('express');
const router = express.Router({ mergeParams: true });

// Giả định controller sẽ được tạo sau
const analysisController = {
  getAnalysis: (req, res) => {
    res.status(200).json({
      success: true,
      data: {}
    });
  }
};

// Routes
router.get('/', analysisController.getAnalysis);

module.exports = router; 
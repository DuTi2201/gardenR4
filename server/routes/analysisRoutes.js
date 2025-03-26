const express = require('express');
const { 
  analyzeGarden,
  getLatestAnalysis,
  applySuggestions
} = require('../controllers/analysis');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

router.route('/gardens/:id/analyze')
  .post(analyzeGarden);

router.route('/gardens/:id/analysis')
  .get(getLatestAnalysis);

router.route('/gardens/:id/apply-suggestions')
  .post(applySuggestions);

module.exports = router; 
const express = require('express');
const { 
  analyzeGarden,
  getLatestAnalysis,
  applySuggestions,
  getAnalysisHistory,
  deleteAnalysis
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

// Thêm route mới cho việc lấy lịch sử phân tích
router.route('/gardens/:id/analysis/history')
  .get(getAnalysisHistory);

// Thêm route cho việc xóa một phân tích khỏi lịch sử
router.route('/gardens/:id/analysis/:analysisId')
  .delete(deleteAnalysis);

module.exports = router; 
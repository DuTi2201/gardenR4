const express = require('express');
const { 
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/schedules');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Áp dụng middleware bảo vệ cho tất cả các routes
router.use(protect);

router.route('/')
  .get(getSchedules)
  .post(createSchedule);

router.route('/:id')
  .put(updateSchedule)
  .delete(deleteSchedule);

module.exports = router; 
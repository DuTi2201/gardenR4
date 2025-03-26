const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  garden_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  device: {
    type: String,
    enum: ['FAN', 'LIGHT', 'PUMP', 'PUMP_2'],
    required: true
  },
  action: {
    type: Boolean,
    required: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  minute: {
    type: Number,
    required: true,
    min: 0,
    max: 59
  },
  days: {
    type: [Number],
    required: true,
    validate: {
      validator: function(array) {
        return array.every(day => day >= 0 && day <= 6);
      },
      message: 'Ngày trong tuần phải trong khoảng từ 0 (CN) đến 6 (Thứ 7)'
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Schedule', ScheduleSchema); 
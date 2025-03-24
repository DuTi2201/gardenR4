const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  garden_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR', 'ANALYSIS', 'SCHEDULE'],
    default: 'INFO'
  },
  read: {
    type: Boolean,
    default: false
  },
  action_url: {
    type: String,
    default: null
  }
});

// Tạo index để tối ưu truy vấn
NotificationSchema.index({ user_id: 1, timestamp: -1 });
NotificationSchema.index({ garden_id: 1, timestamp: -1 });

module.exports = mongoose.model('Notification', NotificationSchema); 
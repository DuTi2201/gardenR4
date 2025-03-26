const mongoose = require('mongoose');

const DeviceHistorySchema = new mongoose.Schema({
  garden_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  device: {
    type: String,
    enum: ['FAN', 'LIGHT', 'PUMP', 'PUMP_2', 'AUTO'],
    required: true
  },
  action: {
    type: String,
    enum: ['ON', 'OFF'],
    required: true
  },
  source: {
    type: String,
    enum: ['AUTO', 'USER', 'SCHEDULE'],
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

// Tạo index để tối ưu truy vấn
DeviceHistorySchema.index({ garden_id: 1, timestamp: -1 });

module.exports = mongoose.model('DeviceHistory', DeviceHistorySchema); 
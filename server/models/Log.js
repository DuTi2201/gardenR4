const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  garden_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  level: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR'],
    default: 'INFO'
  },
  message: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['DEVICE', 'SERVER', 'USER'],
    required: true
  }
});

// Tạo index để tối ưu truy vấn
LogSchema.index({ garden_id: 1, timestamp: -1 });

module.exports = mongoose.model('Log', LogSchema); 
const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  garden_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  url: {
    type: String,
    required: true
  },
  thumbnail_url: {
    type: String,
    default: null
  },
  analysis: {
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    }
  }
});

// Tạo index để tối ưu truy vấn
ImageSchema.index({ garden_id: 1, timestamp: -1 });

module.exports = mongoose.model('Image', ImageSchema); 
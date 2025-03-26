const mongoose = require('mongoose');

const GardenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên vườn là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên không được vượt quá 100 ký tự']
  },
  description: {
    type: String,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
  },
  device_serial: {
    type: String,
    required: [true, 'Mã thiết bị là bắt buộc'],
    unique: true,
    trim: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_connected: {
    type: Date,
    default: null
  },
  is_connected: {
    type: Boolean,
    default: false
  },
  has_camera: {
    type: Boolean,
    default: false
  },
  settings: {
    auto_mode: {
      type: Boolean,
      default: true
    },
    temperature_threshold_high: {
      type: Number,
      default: 35
    },
    temperature_threshold_low: {
      type: Number,
      default: 15
    },
    humidity_threshold_high: {
      type: Number,
      default: 80
    },
    humidity_threshold_low: {
      type: Number,
      default: 40
    },
    light_threshold_high: {
      type: Number,
      default: 80
    },
    light_threshold_low: {
      type: Number,
      default: 20
    },
    soil_threshold_high: {
      type: Number,
      default: 80
    },
    soil_threshold_low: {
      type: Number,
      default: 30
    }
  }
});

module.exports = mongoose.model('Garden', GardenSchema); 
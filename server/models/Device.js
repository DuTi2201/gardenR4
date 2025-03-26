const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  garden_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: [true, 'Vui lòng cung cấp ID khu vườn']
  },
  device_id: {
    type: String,
    required: [true, 'Vui lòng cung cấp ID thiết bị'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Vui lòng cung cấp tên thiết bị'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Vui lòng cung cấp loại thiết bị'],
    enum: ['SENSOR', 'ACTUATOR', 'CAMERA', 'CONTROLLER'],
    default: 'ACTUATOR'
  },
  category: {
    type: String,
    required: [true, 'Vui lòng cung cấp danh mục thiết bị'],
    enum: ['FAN', 'LIGHT', 'PUMP', 'PUMP_2', 'SENSOR', 'CAMERA', 'ESP32'],
    default: 'PUMP'
  },
  status: {
    type: Boolean,
    default: false
  },
  auto_mode: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    default: ''
  },
  parameters: {
    type: Object,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Cập nhật timestamp trước khi update
DeviceSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: new Date() });
  next();
});

module.exports = mongoose.model('Device', DeviceSchema); 
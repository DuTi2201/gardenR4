const mongoose = require('mongoose');

const DeviceSerialSchema = new mongoose.Schema({
  serial: {
    type: String,
    required: [true, 'Mã serial thiết bị là bắt buộc'],
    unique: true,
    trim: true
  },
  is_activated: {
    type: Boolean,
    default: false
  },
  activated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  garden_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    default: null
  },
  activation_date: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('DeviceSerial', DeviceSerialSchema); 
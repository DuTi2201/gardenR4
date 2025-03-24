const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Load model Garden
const Garden = require('./models/Garden');

async function addDeviceSerial() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Đã kết nối với MongoDB');
    
    // Kiểm tra xem device_serial GARDEN8228 đã tồn tại chưa
    const existing = await Garden.findOne({ device_serial: 'GARDEN8228' });
    if (existing) {
      console.log('Mã thiết bị GARDEN8228 đã tồn tại trong cơ sở dữ liệu');
      mongoose.connection.close();
      return;
    }
    
    // Tạo bản ghi mới trong model Garden
    const garden = new Garden({
      name: 'Auto Generated Garden',
      description: 'Vườn tạo tự động cho mã GARDEN8228',
      device_serial: 'GARDEN8228',
      user_id: '67e17804064a7a5c3e1ac297', // ID người dùng đã có
      has_camera: true,
      settings: {
        auto_mode: true,
        temperature_threshold_high: 35,
        temperature_threshold_low: 15,
        humidity_threshold_high: 80,
        humidity_threshold_low: 40,
        light_threshold_high: 80,
        light_threshold_low: 20,
        soil_threshold_high: 80,
        soil_threshold_low: 30
      }
    });
    
    // Lưu vào cơ sở dữ liệu
    await garden.save();
    console.log('Đã thêm mã thiết bị GARDEN8228 vào cơ sở dữ liệu thành công!');
    
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    // Đóng kết nối
    mongoose.connection.close();
  }
}

// Chạy hàm
addDeviceSerial(); 
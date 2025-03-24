const Garden = require('../models/Garden');
const SensorData = require('../models/SensorData');
const Log = require('../models/Log');
const DeviceHistory = require('../models/DeviceHistory');
const Image = require('../models/Image');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

let mqttClient;
let socketIo;

/**
 * Khởi tạo dịch vụ MQTT và đăng ký các lắng nghe
 * @param {Object} client - Client MQTT đã kết nối
 * @param {Object} io - Server Socket.IO
 */
exports.initialize = (client, io) => {
  mqttClient = client;
  socketIo = io;

  // Đăng ký nhận tất cả message từ các vườn
  client.subscribe('garden/+/data');
  client.subscribe('garden/+/status');
  client.subscribe('garden/+/image');
  client.subscribe('garden/+/logs');
  
  // Xử lý message nhận được
  client.on('message', async (topic, message) => {
    try {
      const topicParts = topic.split('/');
      const deviceSerial = topicParts[1];
      const messageType = topicParts[2];

      // Tìm vườn theo device serial
      const garden = await Garden.findOne({ device_serial: deviceSerial });
      if (!garden) {
        console.log(`Received message from unknown device: ${deviceSerial}`);
        return;
      }

      // Cập nhật trạng thái kết nối
      garden.last_connected = new Date();
      await garden.save();

      // Xử lý theo loại tin nhắn
      switch (messageType) {
        case 'data':
          await handleSensorData(garden, message);
          break;
        case 'status':
          await handleStatusUpdate(garden, message);
          break;
        case 'image':
          await handleImageData(garden, message);
          break;
        case 'logs':
          await handleDeviceLogs(garden, message);
          break;
        default:
          console.log(`Unknown message type: ${messageType}`);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });
};

/**
 * Xử lý dữ liệu cảm biến từ thiết bị
 * @param {Object} garden - Thông tin vườn
 * @param {Buffer} messageBuffer - Dữ liệu cảm biến dạng Buffer
 */
const handleSensorData = async (garden, messageBuffer) => {
  try {
    const data = JSON.parse(messageBuffer.toString());
    
    // Tạo bản ghi dữ liệu cảm biến mới
    const sensorData = new SensorData({
      garden_id: garden._id,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      temperature: data.temperature,
      humidity: data.humidity,
      light: data.light,
      soil: data.soil,
      fan_status: data.fan,
      light_status: data.light_status,
      pump_status: data.pump,
      pump2_status: data.pump2,
      auto_mode: data.auto
    });
    
    await sensorData.save();
    
    // Gửi dữ liệu cho client thông qua Socket.IO
    socketIo.to(garden._id.toString()).emit('sensor_data', {
      ...data,
      timestamp: sensorData.timestamp
    });
    
    // Kiểm tra các giá trị cảm biến để gửi thông báo nếu cần
    await checkSensorThresholds(garden, sensorData);
  } catch (error) {
    console.error('Error processing sensor data:', error);
  }
};

/**
 * Xử lý cập nhật trạng thái từ thiết bị
 * @param {Object} garden - Thông tin vườn
 * @param {Buffer} messageBuffer - Dữ liệu trạng thái dạng Buffer
 */
const handleStatusUpdate = async (garden, messageBuffer) => {
  try {
    const status = JSON.parse(messageBuffer.toString());
    
    // Gửi trạng thái kết nối cho client
    socketIo.to(garden._id.toString()).emit('device_status', {
      status: status.status,
      message: status.message,
      timestamp: status.timestamp ? new Date(status.timestamp) : new Date()
    });
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      timestamp: status.timestamp ? new Date(status.timestamp) : new Date(),
      level: status.status === 'connected' ? 'INFO' : 'WARNING',
      message: status.message || `Trạng thái thiết bị: ${status.status}`,
      source: 'DEVICE'
    });
  } catch (error) {
    console.error('Error processing status update:', error);
  }
};

/**
 * Xử lý dữ liệu hình ảnh từ ESP32-CAM
 * @param {Object} garden - Thông tin vườn
 * @param {Buffer} messageBuffer - Dữ liệu hình ảnh dạng Buffer
 */
const handleImageData = async (garden, messageBuffer) => {
  try {
    const imageData = JSON.parse(messageBuffer.toString());
    
    // Tạo bản ghi hình ảnh mới
    const image = new Image({
      garden_id: garden._id,
      timestamp: imageData.timestamp ? new Date(imageData.timestamp) : new Date(),
      url: imageData.url,
      thumbnail_url: imageData.thumbnail_url
    });
    
    await image.save();
    
    // Cập nhật trạng thái camera
    garden.has_camera = true;
    await garden.save();
    
    // Gửi thông báo hình ảnh mới cho client
    socketIo.to(garden._id.toString()).emit('new_image', {
      id: image._id,
      url: image.url,
      thumbnail_url: image.thumbnail_url,
      timestamp: image.timestamp
    });
    
    // Tạo thông báo cho người dùng
    await Notification.create({
      user_id: garden.user_id,
      garden_id: garden._id,
      title: 'Hình ảnh mới',
      message: `Một hình ảnh mới đã được chụp cho vườn ${garden.name}`,
      type: 'INFO',
      action_url: `/gardens/${garden._id}/images/${image._id}`
    });
  } catch (error) {
    console.error('Error processing image data:', error);
  }
};

/**
 * Xử lý log từ thiết bị
 * @param {Object} garden - Thông tin vườn
 * @param {Buffer} messageBuffer - Dữ liệu log dạng Buffer
 */
const handleDeviceLogs = async (garden, messageBuffer) => {
  try {
    const logData = JSON.parse(messageBuffer.toString());
    
    // Tạo bản ghi log mới
    await Log.create({
      garden_id: garden._id,
      timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date(),
      level: logData.level || 'INFO',
      message: logData.message,
      source: 'DEVICE'
    });
  } catch (error) {
    console.error('Error processing device logs:', error);
  }
};

/**
 * Kiểm tra ngưỡng cảm biến và gửi thông báo nếu cần
 * @param {Object} garden - Thông tin vườn
 * @param {Object} sensorData - Dữ liệu cảm biến
 */
const checkSensorThresholds = async (garden, sensorData) => {
  try {
    const { settings } = garden;
    const notifications = [];
    
    // Nhiệt độ
    if (sensorData.temperature > settings.temperature_threshold_high) {
      notifications.push({
        title: 'Cảnh báo nhiệt độ cao',
        message: `Nhiệt độ vườn ${garden.name} đã vượt quá ngưỡng cao (${sensorData.temperature}°C)`,
        type: 'WARNING'
      });
    } else if (sensorData.temperature < settings.temperature_threshold_low) {
      notifications.push({
        title: 'Cảnh báo nhiệt độ thấp',
        message: `Nhiệt độ vườn ${garden.name} đã dưới ngưỡng thấp (${sensorData.temperature}°C)`,
        type: 'WARNING'
      });
    }
    
    // Độ ẩm
    if (sensorData.humidity > settings.humidity_threshold_high) {
      notifications.push({
        title: 'Cảnh báo độ ẩm cao',
        message: `Độ ẩm vườn ${garden.name} đã vượt quá ngưỡng cao (${sensorData.humidity}%)`,
        type: 'WARNING'
      });
    } else if (sensorData.humidity < settings.humidity_threshold_low) {
      notifications.push({
        title: 'Cảnh báo độ ẩm thấp',
        message: `Độ ẩm vườn ${garden.name} đã dưới ngưỡng thấp (${sensorData.humidity}%)`,
        type: 'WARNING'
      });
    }
    
    // Ánh sáng
    if (sensorData.light > settings.light_threshold_high) {
      notifications.push({
        title: 'Cảnh báo ánh sáng cao',
        message: `Ánh sáng vườn ${garden.name} đã vượt quá ngưỡng cao (${sensorData.light}%)`,
        type: 'INFO'
      });
    } else if (sensorData.light < settings.light_threshold_low) {
      notifications.push({
        title: 'Cảnh báo ánh sáng thấp',
        message: `Ánh sáng vườn ${garden.name} đã dưới ngưỡng thấp (${sensorData.light}%)`,
        type: 'INFO'
      });
    }
    
    // Độ ẩm đất
    if (sensorData.soil > settings.soil_threshold_high) {
      notifications.push({
        title: 'Cảnh báo độ ẩm đất cao',
        message: `Độ ẩm đất vườn ${garden.name} đã vượt quá ngưỡng cao (${sensorData.soil}%)`,
        type: 'WARNING'
      });
    } else if (sensorData.soil < settings.soil_threshold_low) {
      notifications.push({
        title: 'Cảnh báo độ ẩm đất thấp',
        message: `Độ ẩm đất vườn ${garden.name} đã dưới ngưỡng thấp (${sensorData.soil}%)`,
        type: 'WARNING'
      });
    }
    
    // Tạo các thông báo
    for (const notification of notifications) {
      await Notification.create({
        user_id: garden.user_id,
        garden_id: garden._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        action_url: `/gardens/${garden._id}`
      });
    }
    
    // Gửi thông báo mới cho client
    if (notifications.length > 0) {
      socketIo.to(garden.user_id.toString()).emit('new_notifications', notifications);
    }
  } catch (error) {
    console.error('Error checking sensor thresholds:', error);
  }
};

/**
 * Gửi lệnh điều khiển đến thiết bị
 * @param {String} deviceSerial - Mã thiết bị
 * @param {String} device - Thiết bị cần điều khiển (FAN, LIGHT, PUMP, PUMP_2, AUTO)
 * @param {Boolean} state - Trạng thái (true=BẬT, false=TẮT)
 * @param {Object} user - Thông tin người dùng thực hiện lệnh
 */
exports.sendCommand = async (deviceSerial, device, state, user) => {
  try {
    // Tìm vườn theo device serial
    const garden = await Garden.findOne({ device_serial: deviceSerial });
    if (!garden) {
      throw new Error('Không tìm thấy vườn với mã thiết bị này');
    }
    
    // Gửi lệnh qua MQTT
    const topic = `garden/${deviceSerial}/command`;
    const message = JSON.stringify({
      device,
      state
    });
    
    mqttClient.publish(topic, message);
    
    // Ghi nhật ký điều khiển thiết bị
    await DeviceHistory.create({
      garden_id: garden._id,
      device,
      action: state ? 'ON' : 'OFF',
      source: 'USER',
      user_id: user ? user._id : null
    });
    
    return true;
  } catch (error) {
    console.error('Error sending command:', error);
    throw error;
  }
};

/**
 * Gửi lệnh chụp ảnh đến thiết bị
 * @param {String} deviceSerial - Mã thiết bị
 */
exports.takePhoto = async (deviceSerial) => {
  try {
    // Tìm vườn theo device serial
    const garden = await Garden.findOne({ device_serial: deviceSerial });
    if (!garden) {
      throw new Error('Không tìm thấy vườn với mã thiết bị này');
    }
    
    // Gửi lệnh qua MQTT
    const topic = `garden/${deviceSerial}/camera`;
    const message = JSON.stringify({
      action: 'take_photo'
    });
    
    mqttClient.publish(topic, message);
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: 'Yêu cầu chụp ảnh được gửi đến thiết bị',
      source: 'SERVER'
    });
    
    return true;
  } catch (error) {
    console.error('Error sending take photo command:', error);
    throw error;
  }
};

/**
 * Điều khiển stream video
 * @param {String} deviceSerial - Mã thiết bị
 * @param {Boolean} enable - Bật/tắt stream
 */
exports.controlStream = async (deviceSerial, enable) => {
  try {
    // Tìm vườn theo device serial
    const garden = await Garden.findOne({ device_serial: deviceSerial });
    if (!garden) {
      throw new Error('Không tìm thấy vườn với mã thiết bị này');
    }
    
    // Gửi lệnh qua MQTT
    const topic = `garden/${deviceSerial}/camera`;
    const message = JSON.stringify({
      action: 'stream',
      enable
    });
    
    mqttClient.publish(topic, message);
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: enable ? 'Yêu cầu bắt đầu stream video được gửi đến thiết bị' : 'Yêu cầu dừng stream video được gửi đến thiết bị',
      source: 'SERVER'
    });
    
    return true;
  } catch (error) {
    console.error('Error controlling stream:', error);
    throw error;
  }
};

/**
 * Đồng bộ trạng thái vườn với thiết bị
 * @param {String} deviceSerial - Mã thiết bị
 */
exports.syncGardenState = async (deviceSerial) => {
  try {
    // Tìm vườn theo device serial
    const garden = await Garden.findOne({ device_serial: deviceSerial });
    if (!garden) {
      throw new Error('Không tìm thấy vườn với mã thiết bị này');
    }
    
    // Gửi lệnh qua MQTT
    const topic = `garden/${deviceSerial}/sync`;
    const message = JSON.stringify({
      timestamp: new Date().getTime()
    });
    
    mqttClient.publish(topic, message);
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: 'Yêu cầu đồng bộ trạng thái vườn được gửi đến thiết bị',
      source: 'SERVER'
    });
    
    return true;
  } catch (error) {
    console.error('Error syncing garden state:', error);
    throw error;
  }
};

/**
 * Gửi lệnh điều khiển đến thiết bị dựa trên ID vườn
 * @param {String} gardenId - ID của vườn
 * @param {String} deviceId - ID của thiết bị
 * @param {String} action - Hành động cần thực hiện
 * @param {*} value - Giá trị điều khiển (nếu có)
 */
exports.sendDeviceCommand = async (gardenId, deviceId, action, value) => {
  try {
    // Tìm vườn theo ID
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      throw new Error('Không tìm thấy vườn với ID này');
    }
    
    // Kiểm tra auto_mode của vườn trước khi điều khiển (chỉ áp dụng khi lệnh từ lịch trình)
    if (action.source === 'SCHEDULE') {
      // Kiểm tra trạng thái auto_mode của vườn
      if (!garden || !garden.settings.auto_mode) {
        console.log('Không thể điều khiển thiết bị vì chế độ tự động bị tắt');
        return;
      }
    }
    
    // Tạo object chứa thông tin lệnh
    const commandData = {
      garden_id: gardenId,
      device_id: deviceId,
      action: action,
      value: value,
      timestamp: new Date()
    };
    
    // Chủ đề MQTT để gửi lệnh
    const commandTopic = `garden/${deviceId}/command`;
    
    // Gửi lệnh qua MQTT
    mqttClient.publish(commandTopic, JSON.stringify(commandData), { qos: 1 }, (err) => {
      if (err) {
        console.error('Lỗi khi gửi lệnh qua MQTT:', err);
      } else {
        console.log(`Đã gửi lệnh ${action} cho thiết bị ${deviceId} qua MQTT`);
        
        // Gửi thông tin cập nhật qua Socket.IO
        socketIo.to(gardenId).emit('device_command', commandData);
      }
    });
    
    // Ghi log
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: `Lệnh điều khiển [${action}] được gửi đến thiết bị [${deviceId}]`,
      source: 'SERVER'
    });
    
    return true;
  } catch (error) {
    console.error('Error sending device command:', error);
    throw error;
  }
}; 
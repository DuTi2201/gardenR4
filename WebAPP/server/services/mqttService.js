const Garden = require('../models/Garden');
const SensorData = require('../models/SensorData');
const Log = require('../models/Log');
const DeviceHistory = require('../models/DeviceHistory');
const Image = require('../models/Image');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const sensorsController = require('../controllers/sensors');

let mqttClient;
let socketIo;
let heartbeatIntervals = {}; // Lưu trữ các interval cho từng thiết bị
const HEARTBEAT_TIMEOUT = 60000; // 60 giây không nhận được tín hiệu -> offline
const CHECK_DEVICE_STATUS_INTERVAL = 30000; // Kiểm tra trạng thái thiết bị mỗi 30 giây

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
  
  // Đăng ký bắt sự kiện lỗi kết nối
  client.on('error', async (error) => {
    console.error('MQTT connection error:', error);
    await handleMQTTDisconnection();
  });
  
  client.on('offline', async () => {
    console.log('MQTT client is offline');
    await handleMQTTDisconnection();
  });
  
  client.on('reconnect', () => {
    console.log('MQTT client is reconnecting...');
  });
  
  // Khởi động hệ thống kiểm tra trạng thái thiết bị định kỳ
  startDeviceStatusChecking();
  
  // Xử lý message nhận được
  client.on('message', async (topic, message) => {
    try {
      const topicParts = topic.split('/');
      const deviceSerial = topicParts[1];
      const messageType = topicParts[2];

      // Tìm vườn theo device_serial hoặc camera_serial
      let garden = await Garden.findOne({
        $or: [
          { device_serial: deviceSerial },
          { camera_serial: deviceSerial }
        ]
      });

      if (!garden) {
        console.log(`Received message from unknown device: ${deviceSerial}`);
        return;
      }

      // Xác định loại thiết bị (Arduino hay Camera)
      const isCamera = garden.camera_serial === deviceSerial;
      console.log(`Nhận tin nhắn từ ${isCamera ? 'ESP32-CAM' : 'Arduino'} với serial ${deviceSerial}`);

      // Cập nhật thời gian kết nối cuối dựa vào loại thiết bị
      if (isCamera) {
        garden.camera_last_connected = new Date();
        
        // Chỉ cập nhật trạng thái kết nối camera nếu đang offline
        if (!garden.camera_is_connected) {
          garden.camera_is_connected = true;
          await garden.save();
          
          // Gửi thông báo kết nối camera cho client
          socketIo.to(garden._id.toString()).emit('camera_connection_status', {
            connected: true,
            timestamp: garden.camera_last_connected,
            message: 'Camera đã kết nối thành công!'
          });
          
          console.log(`Đã cập nhật trạng thái kết nối camera cho vườn ${garden.name} (ID: ${garden._id}, Serial: ${deviceSerial})`);
        } else {
          // Chỉ lưu cập nhật thời gian kết nối
          await garden.save();
        }
        
        // Làm mới heartbeat cho camera
        refreshCameraHeartbeat(deviceSerial, garden._id);
      } else {
        // Đây là Arduino
        garden.last_connected = new Date();
        
        // Chỉ cập nhật và thông báo trạng thái kết nối nếu thiết bị đang offline
        if (!garden.is_connected) {
          garden.is_connected = true;
          await garden.save();
          
          // Gửi thông báo kết nối cho client
          socketIo.to(garden._id.toString()).emit('device_connection_status', {
            connected: true,
            timestamp: garden.last_connected,
            message: 'Thiết bị đã kết nối thành công!'
          });
          
          console.log(`Đã cập nhật trạng thái kết nối cho vườn ${garden.name} (ID: ${garden._id}, Serial: ${deviceSerial})`);
        } else {
          // Nếu thiết bị đã online, chỉ cập nhật thời gian kết nối cuối
          await garden.save();
        }
        
        // Làm mới heartbeat cho thiết bị
        refreshHeartbeat(deviceSerial, garden._id);
      }

      // Xử lý theo loại tin nhắn
      // Đối với camera, chỉ xử lý tin nhắn image và stream
      if (isCamera && (messageType === 'image' || messageType === 'stream' || messageType === 'status')) {
        switch (messageType) {
          case 'image':
            await handleImageData(garden, message);
            break;
          case 'stream':
            await handleStreamData(garden, message);
            break;
          case 'status':
            await handleCameraStatus(garden, message);
            break;
          default:
            console.log(`Không xử lý tin nhắn loại ${messageType} từ camera`);
        }
      } 
      // Đối với Arduino, xử lý các loại tin nhắn khác
      else if (!isCamera) {
        switch (messageType) {
          case 'data':
            await handleSensorData(garden, message);
            break;
          case 'status':
            await handleStatusUpdate(garden, message);
            break;
          case 'logs':
            await handleDeviceLogs(garden, message);
            break;
          default:
            console.log(`Unknown message type: ${messageType}`);
        }
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });
};

/**
 * Làm mới heartbeat cho thiết bị
 * @param {String} deviceSerial - Mã thiết bị
 * @param {String} gardenId - ID của vườn
 */
const refreshHeartbeat = (deviceSerial, gardenId) => {
  // Xóa bỏ interval cũ nếu có
  if (heartbeatIntervals[deviceSerial]) {
    clearTimeout(heartbeatIntervals[deviceSerial]);
  }
  
  // Tạo interval mới
  heartbeatIntervals[deviceSerial] = setTimeout(async () => {
    console.log(`Heartbeat timeout for device: ${deviceSerial}`);
    await updateDeviceConnectionStatus(deviceSerial, false);
    
    // Thông báo cho client về việc thiết bị offline
    socketIo.to(gardenId.toString()).emit('device_connection_status', {
      connected: false,
      timestamp: new Date()
    });
  }, HEARTBEAT_TIMEOUT);
};

/**
 * Cập nhật trạng thái kết nối của thiết bị trong database
 * @param {String} deviceSerial - Mã thiết bị
 * @param {Boolean} isConnected - Trạng thái kết nối
 */
const updateDeviceConnectionStatus = async (deviceSerial, isConnected) => {
  try {
    const garden = await Garden.findOne({ device_serial: deviceSerial });
    if (!garden) {
      console.log(`Không tìm thấy vườn với mã thiết bị: ${deviceSerial}`);
      return;
    }
    
    garden.is_connected = isConnected;
    if (!isConnected) {
      garden.last_disconnected = new Date();
    } else {
      garden.last_connected = new Date();
    }
    
    await garden.save();
    
    console.log(`Đã cập nhật trạng thái kết nối cho vườn ${garden.name} (${deviceSerial}): ${isConnected ? 'Online' : 'Offline'}`);
    
    // Tạo log cho việc mất kết nối
    if (!isConnected) {
      await Log.create({
        garden_id: garden._id,
        level: 'WARNING',
        message: `Thiết bị mất kết nối (không nhận được tín hiệu trong ${HEARTBEAT_TIMEOUT/1000} giây)`,
        source: 'SERVER'
      });
    }
    
    return garden;
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái kết nối:', error);
  }
};

/**
 * Xử lý sự kiện mất kết nối MQTT
 */
const handleMQTTDisconnection = async () => {
  try {
    console.log('Handling MQTT disconnection for all gardens...');
    
    // Cập nhật trạng thái tất cả các vườn trong database
    const gardens = await Garden.find({
      $or: [
        { is_connected: true },
        { camera_is_connected: true }
      ]
    });
    
    for (const garden of gardens) {
      // Đánh dấu Arduino offline
      if (garden.is_connected) {
        garden.is_connected = false;
        garden.last_disconnected = new Date();
        
        // Thông báo cho tất cả các client trong phòng
        console.log(`Gửi thông báo mất kết nối Arduino cho vườn ${garden.name} (ID: ${garden._id})`);
        socketIo.to(garden._id.toString()).emit('device_connection_status', {
          connected: false,
          timestamp: new Date(),
          message: 'Mất kết nối MQTT với Arduino'
        });
        
        // Ghi log
        await Log.create({
          garden_id: garden._id,
          level: 'WARNING',
          message: 'Mất kết nối MQTT với Arduino',
          source: 'SERVER'
        });
      }
      
      // Đánh dấu Camera offline
      if (garden.camera_is_connected) {
        garden.camera_is_connected = false;
        garden.camera_last_disconnected = new Date();
        
        // Thông báo cho tất cả các client trong phòng
        console.log(`Gửi thông báo mất kết nối Camera cho vườn ${garden.name} (ID: ${garden._id})`);
        socketIo.to(garden._id.toString()).emit('camera_connection_status', {
          connected: false,
          timestamp: new Date(),
          message: 'Mất kết nối MQTT với Camera'
        });
        
        // Ghi log
        await Log.create({
          garden_id: garden._id,
          level: 'WARNING',
          message: 'Mất kết nối MQTT với Camera',
          source: 'SERVER'
        });
      }
      
      await garden.save();
      console.log(`Đã cập nhật trạng thái offline cho vườn: ${garden.name}`);
    }
  } catch (error) {
    console.error('Lỗi khi xử lý sự kiện mất kết nối MQTT:', error);
  }
};

/**
 * Khởi động hệ thống kiểm tra trạng thái thiết bị định kỳ
 */
const startDeviceStatusChecking = () => {
  console.log(`Bắt đầu kiểm tra trạng thái thiết bị mỗi ${CHECK_DEVICE_STATUS_INTERVAL/1000} giây`);
  
  setInterval(async () => {
    try {
      // Lấy danh sách vườn có trạng thái is_connected = true hoặc camera_is_connected = true
      const connectedGardens = await Garden.find({
        $or: [
          { is_connected: true },
          { camera_is_connected: true }
        ]
      });
      
      for (const garden of connectedGardens) {
        const currentTime = new Date().getTime();
        
        // Kiểm tra Arduino
        if (garden.is_connected) {
          const lastConnectedTime = garden.last_connected ? new Date(garden.last_connected).getTime() : 0;
          
          // Nếu không nhận được tin hiệu từ Arduino trong khoảng thời gian timeout
          if (currentTime - lastConnectedTime > HEARTBEAT_TIMEOUT) {
            console.log(`Thiết bị ${garden.device_serial} không phản hồi trong ${HEARTBEAT_TIMEOUT/1000} giây. Cập nhật trạng thái offline.`);
            
            garden.is_connected = false;
            garden.last_disconnected = new Date();
            
            // Thông báo cho client
            socketIo.to(garden._id.toString()).emit('device_connection_status', {
              connected: false,
              timestamp: new Date()
            });
            
            // Ghi log
            await Log.create({
              garden_id: garden._id,
              level: 'WARNING',
              message: `Thiết bị mất kết nối (không nhận được tín hiệu trong ${HEARTBEAT_TIMEOUT/1000} giây)`,
              source: 'SERVER'
            });
          }
        }
        
        // Kiểm tra Camera
        if (garden.camera_is_connected) {
          const lastCameraConnectedTime = garden.camera_last_connected ? new Date(garden.camera_last_connected).getTime() : 0;
          
          // Nếu không nhận được tín hiệu từ Camera trong khoảng thời gian timeout
          if (currentTime - lastCameraConnectedTime > HEARTBEAT_TIMEOUT) {
            console.log(`Camera ${garden.camera_serial} không phản hồi trong ${HEARTBEAT_TIMEOUT/1000} giây. Cập nhật trạng thái offline.`);
            
            garden.camera_is_connected = false;
            garden.camera_last_disconnected = new Date();
            
            // Thông báo cho client
            socketIo.to(garden._id.toString()).emit('camera_connection_status', {
              connected: false,
              timestamp: new Date()
            });
            
            // Ghi log
            await Log.create({
              garden_id: garden._id,
              level: 'WARNING',
              message: `Camera mất kết nối (không nhận được tín hiệu trong ${HEARTBEAT_TIMEOUT/1000} giây)`,
              source: 'SERVER'
            });
          }
        }
        
        // Lưu vườn nếu có sự thay đổi
        if (garden.isModified()) {
          await garden.save();
        }
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái thiết bị:', error);
    }
  }, CHECK_DEVICE_STATUS_INTERVAL);
};

/**
 * Xử lý dữ liệu cảm biến từ thiết bị
 * @param {Object} garden - Thông tin vườn
 * @param {Buffer} messageBuffer - Dữ liệu cảm biến dạng Buffer
 */
const handleSensorData = async (garden, messageBuffer) => {
  try {
    const data = JSON.parse(messageBuffer.toString());
    console.log(`[SENSOR DATA] Garden: ${garden.name} (${garden._id}), Data:`, data);
    
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
    console.log(`[SENSOR DATA] Saved new sensor data with ID: ${sensorData._id}`);
    
    // Cập nhật cache dữ liệu cảm biến
    sensorsController.updateSensorDataCache(garden._id, sensorData);
    
    // Chuẩn bị dữ liệu để gửi qua socket
    const socketData = {
      ...data,
      timestamp: sensorData.timestamp
    };
    
    // Gửi dữ liệu cho client thông qua Socket.IO
    console.log(`[SOCKET] Emitting 'sensor_data' to room ${garden._id.toString()}`);
    socketIo.to(garden._id.toString()).emit('sensor_data', socketData);
    
    // Gửi thêm sự kiện sensor_data_update vì frontend đang lắng nghe sự kiện này
    console.log(`[SOCKET] Emitting 'sensor_data_update' to room ${garden._id.toString()}`);
    socketIo.to(garden._id.toString()).emit('sensor_data_update', socketData);
    
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
    console.log(`[STATUS UPDATE] Garden: ${garden.name} (${garden._id}), Status:`, status);
    
    // Chuẩn bị dữ liệu trạng thái
    const statusData = {
      status: status.status,
      message: status.message,
      timestamp: status.timestamp ? new Date(status.timestamp) : new Date()
    };
    
    // Gửi trạng thái kết nối cho client
    console.log(`[SOCKET] Emitting 'device_status' to room ${garden._id.toString()}`);
    socketIo.to(garden._id.toString()).emit('device_status', statusData);
    
    // Gửi thêm sự kiện device_status_update vì frontend đang lắng nghe sự kiện này
    console.log(`[SOCKET] Emitting 'device_status_update' to room ${garden._id.toString()}`);
    socketIo.to(garden._id.toString()).emit('device_status_update', {
      device: 'all',
      state: status.status === 'connected',
      message: status.message,
      timestamp: statusData.timestamp
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
      console.error(`Không tìm thấy vườn với mã thiết bị: ${deviceSerial}`);
      throw new Error('Không tìm thấy vườn với mã thiết bị này');
    }
    
    console.log(`[MQTT] Đang gửi lệnh điều khiển: thiết bị=${device}, trạng thái=${state}, tới serial=${deviceSerial}`);
    
    // Gửi lệnh qua MQTT
    const topic = `garden/${deviceSerial}/command`;
    const message = JSON.stringify({
      device,
      state
    });
    
    // Sử dụng callback để xác nhận gửi thành công
    mqttClient.publish(topic, message, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Lỗi gửi lệnh tới ${topic}:`, err);
      } else {
        console.log(`[MQTT] Đã gửi lệnh thành công tới ${topic}: ${message}`);
      }
    });
    
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
 * @param {String} garden_id - ID của vườn (tùy chọn)
 */
exports.takePhoto = async (deviceSerial, garden_id) => {
  try {
    console.log(`[DEBUG] Hàm takePhoto được gọi với deviceSerial=${deviceSerial}, garden_id=${garden_id}`);
    
    // Không cần tìm vườn theo device serial nữa
    if (!deviceSerial) {
      throw new Error('Thiếu thông tin mã thiết bị camera');
    }
    
    console.log(`[DEBUG] Gửi lệnh chụp ảnh đến camera với serial: ${deviceSerial}`);
    
    // Gửi lệnh qua MQTT đến camera
    const topic = `garden/${deviceSerial}/camera`;
    const message = JSON.stringify({
      action: 'take_photo'
    });
    
    if (!mqttClient || !mqttClient.connected) {
      console.error('[ERROR] MQTT client không khả dụng hoặc không kết nối');
      throw new Error('Không thể kết nối đến MQTT broker');
    }
    
    mqttClient.publish(topic, message);
    console.log(`[DEBUG] Đã publish lệnh chụp ảnh đến topic ${topic}`);
    
    // Ghi log
    try {
      const logData = {
        level: 'INFO',
        message: 'Yêu cầu chụp ảnh được gửi đến thiết bị camera',
        source: 'SERVER'
      };
      
      // Thêm garden_id nếu có
      if (garden_id) {
        logData.garden_id = garden_id;
      }
      
      await Log.create(logData);
    } catch (logError) {
      console.error('[ERROR] Không thể ghi log:', logError);
    }
    
    return true;
  } catch (error) {
    console.error('[ERROR] Error sending take photo command:', error);
    throw error;
  }
};

/**
 * Điều khiển stream video
 * @param {String} deviceSerial - Mã thiết bị
 * @param {Boolean} enable - Bật/tắt stream
 * @param {String} garden_id - ID của vườn (tùy chọn)
 */
exports.controlStream = async (deviceSerial, enable, garden_id) => {
  try {
    console.log(`[DEBUG] Hàm controlStream được gọi với deviceSerial=${deviceSerial}, enable=${enable}, garden_id=${garden_id}`);
    
    // Không cần tìm vườn theo device serial nữa
    if (!deviceSerial) {
      throw new Error('Thiếu thông tin mã thiết bị camera');
    }
    
    console.log(`[DEBUG] Gửi lệnh ${enable ? 'bắt đầu' : 'dừng'} stream đến camera với serial: ${deviceSerial}`);
    
    // Gửi lệnh qua MQTT đến camera
    const topic = `garden/${deviceSerial}/camera`;
    const message = JSON.stringify({
      action: 'stream',
      enable
    });
    
    if (!mqttClient || !mqttClient.connected) {
      console.error('[ERROR] MQTT client không khả dụng hoặc không kết nối');
      throw new Error('Không thể kết nối đến MQTT broker');
    }
    
    mqttClient.publish(topic, message);
    console.log(`[DEBUG] Đã publish lệnh stream đến topic ${topic}`);
    
    // Ghi log
    try {
      const logData = {
        level: 'INFO',
        message: enable ? 'Yêu cầu bắt đầu stream video được gửi đến camera' : 'Yêu cầu dừng stream video được gửi đến camera',
        source: 'SERVER'
      };
      
      // Thêm garden_id nếu có
      if (garden_id) {
        logData.garden_id = garden_id;
      }
      
      await Log.create(logData);
    } catch (logError) {
      console.error('[ERROR] Không thể ghi log:', logError);
    }
    
    return true;
  } catch (error) {
    console.error('[ERROR] Error controlling stream:', error);
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

/**
 * Làm mới heartbeat cho camera
 * @param {String} cameraSerial - Mã thiết bị camera
 * @param {String} gardenId - ID của vườn
 */
const refreshCameraHeartbeat = (cameraSerial, gardenId) => {
  // Tạo key duy nhất cho camera
  const cameraKey = `camera_${cameraSerial}`;
  
  // Xóa bỏ interval cũ nếu có
  if (heartbeatIntervals[cameraKey]) {
    clearTimeout(heartbeatIntervals[cameraKey]);
  }
  
  // Tạo interval mới
  heartbeatIntervals[cameraKey] = setTimeout(async () => {
    console.log(`Camera heartbeat timeout for device: ${cameraSerial}`);
    await updateCameraConnectionStatus(cameraSerial, false);
    
    // Thông báo cho client về việc camera offline
    socketIo.to(gardenId.toString()).emit('camera_connection_status', {
      connected: false,
      timestamp: new Date()
    });
  }, HEARTBEAT_TIMEOUT);
};

/**
 * Cập nhật trạng thái kết nối của camera trong database
 * @param {String} cameraSerial - Mã thiết bị camera
 * @param {Boolean} isConnected - Trạng thái kết nối
 */
const updateCameraConnectionStatus = async (cameraSerial, isConnected) => {
  try {
    const garden = await Garden.findOne({ camera_serial: cameraSerial });
    if (!garden) {
      console.log(`Không tìm thấy vườn với mã camera: ${cameraSerial}`);
      return;
    }
    
    garden.camera_is_connected = isConnected;
    if (!isConnected) {
      garden.camera_last_disconnected = new Date();
    } else {
      garden.camera_last_connected = new Date();
    }
    
    await garden.save();
    
    console.log(`Đã cập nhật trạng thái kết nối camera cho vườn ${garden.name} (${cameraSerial}): ${isConnected ? 'Online' : 'Offline'}`);
    
    // Tạo log cho việc mất kết nối camera
    if (!isConnected) {
      await Log.create({
        garden_id: garden._id,
        level: 'WARNING',
        message: `Camera mất kết nối (không nhận được tín hiệu trong ${HEARTBEAT_TIMEOUT/1000} giây)`,
        source: 'SERVER'
      });
    }
    
    return garden;
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái kết nối camera:', error);
  }
};

/**
 * Xử lý trạng thái camera
 */
const handleCameraStatus = async (garden, messageBuffer) => {
  try {
    const message = messageBuffer.toString();
    console.log(`Camera status from ${garden.camera_serial}:`, message);
    
    let status;
    try {
      status = JSON.parse(message);
    } catch (err) {
      console.error('Failed to parse camera status message:', err);
      return;
    }
    
    // Gửi trạng thái camera cho client qua Socket.io
    socketIo.to(garden._id.toString()).emit('camera_status', {
      ...status,
      timestamp: new Date()
    });
    
    // Lưu log về trạng thái camera
    await Log.create({
      garden_id: garden._id,
      level: 'INFO',
      message: `Trạng thái camera: ${JSON.stringify(status)}`,
      source: 'CAMERA'
    });
  } catch (error) {
    console.error('Error handling camera status update:', error);
  }
};

/**
 * Xử lý dữ liệu stream
 */
const handleStreamData = async (garden, messageBuffer) => {
  try {
    // Đối với dữ liệu stream, chúng ta không lưu vào DB mà gửi trực tiếp qua Socket.io
    socketIo.to(garden._id.toString()).emit('stream_frame', {
      data: messageBuffer,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error handling stream data:', error);
  }
}; 
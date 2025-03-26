const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const mqtt = require('mqtt');
const path = require('path');

// Load env vars
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const gardenRoutes = require('./routes/gardenRoutes');
const { deviceRouter } = require('./routes/deviceRoutes');
const sensorDataRoutes = require('./routes/sensorDataRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const imageRoutes = require('./routes/imageRoutes');
const streamRoutes = require('./routes/streamRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const { logRouter } = require('./routes/logRoutes');
const testRoutes = require('./routes/testRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');

// Import services
const mqttService = require('./services/mqttService');

// Import controllers
const { getLatestSensorData, getSensorDataHistory, getSensorDataStats } = require('./controllers/sensorData');
const { getDevices, createDevice, getDevicesStatus, controlDevice, toggleAutoMode } = require('./controllers/devices');
const { analyzeGarden, getLatestAnalysis } = require('./controllers/analysis');
const { getImages, getImage, captureImage, deleteImage } = require('./controllers/images');
const { getSchedules, createSchedule, updateSchedule, deleteSchedule } = require('./controllers/schedules');
const gardensController = require('./controllers/gardens');

// Create Express application
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Lưu đối tượng io vào app để có thể sử dụng trong các controller
app.set('socketio', io);

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Tắt CSP tạm thời để các tệp tĩnh hoạt động
  crossOriginEmbedderPolicy: false,
}));

// Phục vụ các tệp tin tĩnh từ thư mục frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Log các request tới server
app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.originalUrl}`);
  next();
});

// Tạo route API đơn giản thay thế
app.get('/api', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Smart Garden API is running',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Đăng ký các endpoint cảm biến riêng lẻ 
app.get('/api/gardens/:id/sensor-data', protect, getLatestSensorData);
app.get('/api/gardens/:id/sensor-data/history', protect, getSensorDataHistory);
app.get('/api/gardens/:id/sensor-data/stats', protect, getSensorDataStats);

// Đăng ký endpoint devices riêng lẻ (giải pháp tạm thời)
app.get('/api/gardens/:id/devices', protect, getDevices);
app.post('/api/gardens/:id/devices', protect, createDevice);
app.get('/api/gardens/:id/devices/status', protect, getDevicesStatus);

// Thêm endpoint điều khiển thiết bị
app.post('/api/gardens/:id/devices/control', protect, controlDevice);

// Thêm endpoint bật/tắt chế độ tự động
app.post('/api/gardens/:id/auto-mode', protect, toggleAutoMode);

// Đăng ký endpoint lịch trình
app.get('/api/gardens/:id/schedules', protect, getSchedules);
app.post('/api/gardens/:id/schedules', protect, createSchedule);
app.put('/api/gardens/:id/schedules/:scheduleId', protect, updateSchedule);
app.delete('/api/gardens/:id/schedules/:scheduleId', protect, deleteSchedule);

// Đăng ký endpoint phân tích riêng lẻ
app.get('/api/gardens/:id/analysis', protect, getLatestAnalysis);
app.post('/api/gardens/:id/analyze', protect, analyzeGarden);

// Đăng ký endpoint hình ảnh riêng lẻ
app.get('/api/gardens/:id/images', protect, getImages);
app.get('/api/gardens/:id/images/:imageId', protect, getImage);
app.post('/api/gardens/:id/images/capture', protect, captureImage);
app.delete('/api/gardens/:id/images/:imageId', protect, deleteImage);

// Thêm endpoint camera capture và stream
app.post('/api/gardens/camera/:deviceSerial/capture', protect, gardensController.captureImage);
app.post('/api/gardens/camera/:deviceSerial/stream', protect, gardensController.controlStream);

// Đăng ký garden routes (bao gồm cả device routes)
app.use('/api/gardens', gardenRoutes);

// Các routes khác
app.use('/api/devices', deviceRouter);
app.use('/api/logs', logRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/test', testRoutes);

// Thêm debug middleware cho admin routes
app.use('/api/admin', (req, res, next) => {
  console.log(`Admin API Request: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  next();
}, adminRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Connect to MongoDB
console.log("MONGODB_URI:", process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected...');
    
    // Socket.io connection
    io.on('connection', (socket) => {
      console.log('Client connected: ' + socket.id);
      
      socket.on('join_garden', (gardenId) => {
        socket.join(gardenId);
        console.log(`Socket ${socket.id} joined garden: ${gardenId}`);
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected: ' + socket.id);
      });
    });
    
    // Connect to MQTT broker and initialize services
    try {
      const mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD
      });
      
      mqttClient.on('connect', () => {
        console.log('Connected to MQTT broker');
        mqttService.initialize(mqttClient, io);
      });
      
      mqttClient.on('error', (err) => {
        console.error('MQTT connection error:', err);
      });
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
    }
    
    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
}); 
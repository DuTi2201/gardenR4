const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const mqtt = require('mqtt');

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

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');

// Import services
const mqttService = require('./services/mqttService');

// Create Express application
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());

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
app.use('/api/gardens', gardenRoutes);
app.use('/api/devices', deviceRouter);
app.use('/api/logs', logRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analysis', analysisRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Connect to MongoDB
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
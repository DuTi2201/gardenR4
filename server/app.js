const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

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

// Create Express application
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());

// Middleware để log tất cả requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
app.use('/api/gardens', gardenRoutes);
app.use('/api/devices', deviceRouter);
app.use('/api/logs', logRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler Middleware
app.use(errorHandler);

module.exports = app; 
import axios from 'axios';
import api from './api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Tạo instance axios với cấu hình mặc định
const apiInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Thêm interceptor để tự động thêm token vào header
apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const deviceService = {
  // Lấy trạng thái các thiết bị trong vườn
  getDevices: async (gardenId) => {
    const response = await apiInstance.get(`gardens/${gardenId}/devices`);
    return response.data;
  },

  // Thêm thiết bị mới
  addDevice: async (gardenId, deviceData) => {
    // Đảm bảo loại thiết bị đúng với enum ở backend
    const formattedData = {
      ...deviceData,
      type: 'ACTUATOR', // Giá trị enum hợp lệ trên backend
      category: deviceData.type.toUpperCase() // Chuyển đổi loại sang category
    };
    const response = await apiInstance.post(`gardens/${gardenId}/devices`, formattedData);
    return response.data;
  },

  // Điều khiển thiết bị
  controlDevice: async (gardenId, device, state) => {
    try {
      const response = await apiInstance.post(`gardens/${gardenId}/devices/control`, {
        device: device,
        action: state
      });
      return response.data;
    } catch (error) {
      console.error(`Error controlling device ${device}:`, error);
      throw error;
    }
  },

  // Gửi lệnh điều khiển thiết bị
  sendDeviceCommand: async (gardenId, deviceSerial, command) => {
    try {
      const response = await apiInstance.post(`gardens/${gardenId}/device/${deviceSerial}/command`, command);
      return response.data;
    } catch (error) {
      console.error('Error sending device command:', error);
      throw error;
    }
  },

  // Bật/tắt chế độ tự động
  setAutoMode: async (gardenId, enabled) => {
    try {
      const response = await apiInstance.post(`gardens/${gardenId}/auto-mode`, {
        action: enabled
      });
      return response.data;
    } catch (error) {
      console.error('Error setting auto mode:', error);
      throw error;
    }
  },

  // Lấy lịch sử hoạt động của thiết bị
  getDeviceHistory: async (gardenId, params = {}) => {
    const response = await apiInstance.get(`gardens/${gardenId}/devices/history`, { params });
    return response.data;
  },

  // Lấy trạng thái thiết bị
  getDeviceStatus: async (gardenId) => {
    try {
      const response = await apiInstance.get(`gardens/${gardenId}/devices/status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Yêu cầu camera chụp ảnh
  captureImage: async (deviceSerial) => {
    try {
      console.log(`Gửi lệnh chụp ảnh tới camera ${deviceSerial}`);
      const response = await apiInstance.post(`gardens/camera/${deviceSerial}/capture`);
      return response.data;
    } catch (error) {
      console.error('Error capturing image:', error);
      throw error;
    }
  },

  // Điều khiển stream video
  controlStream: async (deviceSerial, enable) => {
    try {
      console.log(`Gửi lệnh ${enable ? 'bắt đầu' : 'dừng'} stream tới camera ${deviceSerial}`);
      const response = await apiInstance.post(`gardens/camera/${deviceSerial}/stream`, {
        enable
      });
      return response.data;
    } catch (error) {
      console.error('Error controlling stream:', error);
      throw error;
    }
  }
};

export default deviceService; 
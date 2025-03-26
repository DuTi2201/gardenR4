import axios from 'axios';

// Sửa API_URL để thêm lại /api vào baseURL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để thêm token vào header
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    console.log('Request Data:', config.data);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => {
    console.log(`API Response Success: ${response.config.method.toUpperCase()} ${response.config.url}`);
    console.log('Response Data:', response.data);
    return response;
  },
  (error) => {
    console.error(`API Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.data || error.message);
    console.error('Error details:', error);
    
    if (error.response && error.response.status === 401) {
      // Xử lý khi token hết hạn
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 
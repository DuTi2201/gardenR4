import api from './api';

const sensorService = {
  // Lấy dữ liệu cảm biến mới nhất
  getLatestData: async (gardenId) => {
    const response = await api.get(`/gardens/${gardenId}/sensor-data`);
    return response.data;
  },

  // Lấy lịch sử dữ liệu cảm biến
  getDataHistory: async (gardenId, params = {}) => {
    const response = await api.get(`/gardens/${gardenId}/sensor-data/history`, { params });
    return response.data;
  },
  
  // Lấy dữ liệu thống kê
  getStats: async (gardenId, params = {}) => {
    const response = await api.get(`/gardens/${gardenId}/sensor-data/stats`, { params });
    return response.data;
  },
};

export default sensorService; 
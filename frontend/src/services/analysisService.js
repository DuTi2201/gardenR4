import api from './api';

const analysisService = {
  // Phân tích dữ liệu vườn
  analyzeGarden: async (gardenId) => {
    const response = await api.post(`gardens/${gardenId}/analyze`);
    return response.data;
  },

  // Lấy kết quả phân tích gần nhất
  getLatestAnalysis: async (gardenId) => {
    const response = await api.get(`gardens/${gardenId}/analysis`);
    return response.data;
  },
};

export default analysisService; 
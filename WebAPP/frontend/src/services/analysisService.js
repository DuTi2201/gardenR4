import api from './api';
import axios from 'axios';
// Sử dụng khai báo trực tiếp thay vì import từ config
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const analysisService = {
  // Phân tích dữ liệu vườn
  analyzeGarden: async (gardenId) => {
    try {
      console.log('Gọi API phân tích vườn:', `/gardens/${gardenId}/analyze`);
      const response = await api.post(`gardens/${gardenId}/analyze`);
      console.log('Phản hồi từ API phân tích:', response.data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi gọi API phân tích:', error.response || error);
      throw error;
    }
  },

  // Lấy kết quả phân tích gần nhất
  getLatestAnalysis: async (gardenId) => {
    try {
      console.log('Gọi API lấy phân tích gần nhất:', `/gardens/${gardenId}/analysis`);
      const response = await api.get(`gardens/${gardenId}/analysis`);
      console.log('Phản hồi từ API lấy phân tích:', response.data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi gọi API lấy phân tích:', error.response || error);
      return { success: false, message: error.response?.data?.message || 'Không thể lấy dữ liệu phân tích' };
    }
  },
  
  // Áp dụng đề xuất vào lịch trình
  applySuggestions: async (gardenId, suggestions) => {
    try {
      console.log('Gọi API áp dụng đề xuất:', `/gardens/${gardenId}/apply-suggestions`);
      console.log('Dữ liệu gửi đi:', suggestions);
      const response = await api.post(`gardens/${gardenId}/apply-suggestions`, { suggestions });
      console.log('Phản hồi từ API áp dụng đề xuất:', response.data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi gọi API áp dụng đề xuất:', error.response || error);
      throw error;
    }
  },
  
  // Lấy lịch sử phân tích
  getAnalysisHistory: async (gardenId) => {
    try {
      console.log('Gọi API lấy lịch sử phân tích:', `/gardens/${gardenId}/analysis/history`);
      const response = await api.get(`gardens/${gardenId}/analysis/history`);
      console.log('Phản hồi từ API lấy lịch sử phân tích:', response.data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi gọi API lấy lịch sử phân tích:', error.response || error);
      return { success: false, message: error.response?.data?.message || 'Không thể lấy lịch sử phân tích' };
    }
  },
  
  // Xóa một phân tích khỏi lịch sử
  deleteAnalysis: async (gardenId, analysisId) => {
    try {
      console.log('Gọi API xóa phân tích:', `/gardens/${gardenId}/analysis/${analysisId}`);
      const response = await api.delete(`gardens/${gardenId}/analysis/${analysisId}`);
      console.log('Phản hồi từ API xóa phân tích:', response.data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi gọi API xóa phân tích:', error.response || error);
      throw error;
    }
  },

  // Phân tích hình ảnh cho một vườn
  analyzeImage: async (gardenId, imageId) => {
    try {
      const response = await axios.post(`${API_URL}/gardens/${gardenId}/analyze`, { imageId });
      return response.data;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  }
};

export default analysisService; 
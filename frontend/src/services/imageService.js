import api from './api';

const imageService = {
  // Lấy danh sách hình ảnh
  getImages: async (gardenId, params = {}) => {
    const response = await api.get(`/gardens/${gardenId}/images`, { params });
    return response.data;
  },

  // Lấy chi tiết hình ảnh
  getImageById: async (gardenId, imageId) => {
    const response = await api.get(`/gardens/${gardenId}/images/${imageId}`);
    return response.data;
  },

  // Yêu cầu chụp ảnh mới
  captureImage: async (gardenId) => {
    const response = await api.post(`/gardens/${gardenId}/images/capture`);
    return response.data;
  },

  // Xóa hình ảnh
  deleteImage: async (gardenId, imageId) => {
    const response = await api.delete(`/gardens/${gardenId}/images/${imageId}`);
    return response.data;
  },

  // Kiểm tra trạng thái stream
  getStreamStatus: async (gardenId) => {
    const response = await api.get(`/gardens/${gardenId}/stream/status`);
    return response.data;
  },

  // Bắt đầu stream
  startStream: async (gardenId) => {
    const response = await api.post(`/gardens/${gardenId}/stream/start`);
    return response.data;
  },

  // Dừng stream
  stopStream: async (gardenId) => {
    const response = await api.post(`/gardens/${gardenId}/stream/stop`);
    return response.data;
  },
};

export default imageService; 
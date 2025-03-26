import api from './api';

/**
 * Lấy danh sách hình ảnh của một vườn
 * @param {string} gardenId - ID của vườn
 * @param {object} params - Các tham số truy vấn (limit, skip, sort)
 * @returns {Promise} - Promise xử lý kết quả API
 */
export const getGardenImages = async (gardenId, params = {}) => {
  try {
    const response = await api.get(`/gardens/${gardenId}/images`, { params });
    return response.data.images;
  } catch (error) {
    console.error('Error getting garden images:', error);
    throw error;
  }
};

/**
 * Lấy chi tiết một hình ảnh
 * @param {string} imageId - ID của hình ảnh
 * @returns {Promise} - Promise xử lý kết quả API
 */
export const getImageById = async (imageId) => {
  try {
    const response = await api.get(`/images/${imageId}`);
    return response.data.image;
  } catch (error) {
    console.error('Error getting image details:', error);
    throw error;
  }
};

/**
 * Xóa một hình ảnh
 * @param {string} imageId - ID của hình ảnh
 * @returns {Promise} - Promise xử lý kết quả API
 */
export const deleteImage = async (imageId) => {
  try {
    const response = await api.delete(`/images/${imageId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Phân tích một hình ảnh để xác định tình trạng cây
 * @param {string} imageId - ID của hình ảnh
 * @returns {Promise} - Promise xử lý kết quả API
 */
export const analyzeImage = async (imageId) => {
  try {
    const response = await api.post(`/images/${imageId}/analyze`);
    return response.data;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

export default {
  getGardenImages,
  getImageById,
  deleteImage,
  analyzeImage
}; 
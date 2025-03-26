import api from './api';

const notificationService = {
  // Lấy danh sách thông báo
  getNotifications: async (params = {}) => {
    try {
      const response = await api.get('/notifications', { params });
      // Trả về dữ liệu đã được cấu trúc lại cho phù hợp
      return {
        notifications: response.data.data || [], // Mảng rỗng mặc định nếu không có dữ liệu
        count: response.data.count || 0,
        total: response.data.total || 0,
        pagination: response.data.pagination || { current: 1, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Trả về một đối tượng mặc định với mảng notifications rỗng
      return { notifications: [], count: 0, total: 0, pagination: { current: 1, pages: 0 } };
    }
  },

  // Đánh dấu thông báo đã đọc
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Xóa thông báo
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
  
  // Đánh dấu tất cả thông báo đã đọc
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
};

export default notificationService; 
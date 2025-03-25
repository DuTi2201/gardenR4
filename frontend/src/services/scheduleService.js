import api from './api';

const scheduleService = {
  // Lấy danh sách lịch trình
  getSchedules: async (gardenId) => {
    const response = await api.get(`gardens/${gardenId}/schedules`);
    return response.data;
  },

  // Tạo lịch trình mới
  createSchedule: async (gardenId, scheduleData) => {
    const response = await api.post(`gardens/${gardenId}/schedules`, scheduleData);
    return response.data;
  },

  // Cập nhật lịch trình
  updateSchedule: async (gardenId, scheduleId, scheduleData) => {
    const response = await api.put(`gardens/${gardenId}/schedules/${scheduleId}`, scheduleData);
    return response.data;
  },

  // Xóa lịch trình
  deleteSchedule: async (gardenId, scheduleId) => {
    const response = await api.delete(`gardens/${gardenId}/schedules/${scheduleId}`);
    return response.data;
  },
};

export default scheduleService; 
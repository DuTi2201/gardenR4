import api from './api';

const deviceService = {
  // Lấy trạng thái các thiết bị trong vườn
  getDevices: async (gardenId) => {
    const response = await api.get(`gardens/${gardenId}/devices`);
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
    const response = await api.post(`gardens/${gardenId}/devices`, formattedData);
    return response.data;
  },

  // Điều khiển thiết bị (BẬT/TẮT)
  controlDevice: async (gardenId, deviceId, state) => {
    const response = await api.post(`gardens/${gardenId}/devices/${deviceId}/control`, { state });
    return response.data;
  },

  // Bật/tắt chế độ tự động
  setAutoMode: async (gardenId, enabled) => {
    const response = await api.put(`gardens/${gardenId}/thresholds`, { auto_mode: enabled });
    return response.data;
  },

  // Lấy lịch sử hoạt động của thiết bị
  getDeviceHistory: async (gardenId, params = {}) => {
    const response = await api.get(`gardens/${gardenId}/devices/history`, { params });
    return response.data;
  },
};

export default deviceService; 
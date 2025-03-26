import api from './api';

const gardenService = {
  // Lấy danh sách vườn của người dùng
  getGardens: async () => {
    try {
      const response = await api.get('/gardens');
      // Đảm bảo trả về cấu trúc dữ liệu phù hợp với mảng gardens
      return {
        gardens: response.data.data || [], // Mảng rỗng mặc định nếu không có dữ liệu
        count: response.data.count || 0
      };
    } catch (error) {
      console.error('Error fetching gardens:', error);
      // Trả về một đối tượng mặc định với mảng gardens rỗng
      return { gardens: [], count: 0 };
    }
  },

  // Lấy thông tin chi tiết của một vườn
  getGardenById: async (id) => {
    try {
      const response = await api.get(`/gardens/${id}`);
      console.log('API Response:', response.data);
      
      // Nếu không có dữ liệu, trả về đối tượng với success=false
      if (!response.data || !response.data.garden) {
        return {
          success: false,
          message: 'Không tìm thấy dữ liệu vườn',
          garden: {
            _id: id,
            name: 'Chưa có tên vườn',
            description: 'Không có mô tả',
            device_serial: 'Chưa kết nối',
            last_connected: null,
            is_connected: false,
            has_camera: false,
            sensor_data: null,
            devices: []
          }
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching garden:', error);
      // Trả về đối tượng với success=false thay vì ném lỗi
      return {
        success: false,
        message: error.message || 'Không thể tải dữ liệu vườn',
        garden: {
          _id: id,
          name: 'Chưa có tên vườn',
          description: 'Không có mô tả',
          device_serial: 'Chưa kết nối',
          last_connected: null,
          is_connected: false,
          has_camera: false,
          sensor_data: null,
          devices: []
        }
      };
    }
  },

  // Tạo vườn mới
  createGarden: async (gardenData) => {
    const response = await api.post('/gardens', gardenData);
    return response.data;
  },

  // Cập nhật thông tin vườn
  updateGarden: async (id, gardenData) => {
    const response = await api.put(`/gardens/${id}`, gardenData);
    return response.data;
  },

  // Xóa một vườn
  deleteGarden: async (id) => {
    const response = await api.delete(`/gardens/${id}`);
    return response.data;
  },

  // Xác minh serial hợp lệ
  verifySerial: async (deviceSerial) => {
    const response = await api.post('/gardens/verify', { deviceSerial });
    return response.data;
  },

  // Cập nhật cài đặt vườn
  updateSettings: async (id, settings) => {
    const response = await api.put(`/gardens/${id}/settings`, settings);
    return response.data;
  },
};

export default gardenService; 
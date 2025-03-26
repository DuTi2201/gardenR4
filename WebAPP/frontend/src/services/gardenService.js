import api from './api';

const gardenService = {
  // Lấy danh sách vườn của người dùng
  getGardens: async () => {
    try {
      const response = await api.get('/gardens');
      console.log('Garden API Response:', response.data);
      
      // Kiểm tra cấu trúc dữ liệu
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.warn('API trả về cấu trúc dữ liệu không hợp lệ, sử dụng mảng rỗng');
        return { gardens: [], count: 0 };
      }
      
      // Đảm bảo mỗi vườn có đầy đủ thuộc tính để tránh lỗi undefined
      const processedGardens = response.data.data.map(garden => {
        if (!garden) return null;
        
        return {
          ...garden,
          _id: garden._id || `temp-${Math.random().toString(36).substr(2, 9)}`,
          name: garden.name || 'Chưa có tên',
          description: garden.description || 'Không có mô tả',
          device_serial: garden.device_serial || 'Chưa kết nối',
          is_connected: !!garden.is_connected,
          last_connected: garden.last_connected || null,
          has_camera: !!garden.has_camera,
          image: garden.image || null
        };
      }).filter(garden => garden !== null); // Loại bỏ các phần tử null
      
      return {
        gardens: processedGardens,
        count: processedGardens.length
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
      console.log('Calling API to fetch garden with ID:', id);
      const response = await api.get(`/gardens/${id}`);
      console.log('Raw API Response:', response);
      console.log('API Response Data:', response.data);
      
      // Nếu không có dữ liệu, trả về đối tượng với success=false
      if (!response.data || !response.data.garden) {
        console.log('Không tìm thấy dữ liệu vườn thực tế, trả về dữ liệu mặc định');
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
      
      console.log('Garden data đã xử lý:', response.data);
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
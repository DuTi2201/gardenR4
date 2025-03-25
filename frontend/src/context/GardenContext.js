import React, { createContext, useState, useEffect, useContext } from 'react';
import { gardenService } from '../services';

const GardenContext = createContext();

export const useGarden = () => useContext(GardenContext);

export const GardenProvider = ({ children }) => {
  const [gardens, setGardens] = useState([]);
  const [currentGarden, setCurrentGarden] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Chỉ tải dữ liệu vườn khi người dùng đã đăng nhập (có token)
    const token = localStorage.getItem('token');
    if (token) {
      fetchGardens();
    }
  }, []);

  const fetchGardens = async () => {
    try {
      setLoading(true);
      const data = await gardenService.getGardens();
      setGardens(data.gardens);
      if (data.gardens.length > 0 && !currentGarden) {
        setCurrentGarden(data.gardens[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu vườn');
      console.error('Lỗi khi tải vườn:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGardenById = async (gardenId) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching garden with ID:', gardenId);
      
      const response = await gardenService.getGardenById(gardenId);
      console.log('Garden service response:', response);
      
      if (response && response.garden) {
        setCurrentGarden(response.garden);
        setGardens(prevGardens => {
          const index = prevGardens.findIndex(g => g._id === gardenId);
          if (index !== -1) {
            const newGardens = [...prevGardens];
            newGardens[index] = response.garden;
            return newGardens;
          }
          return [...prevGardens, response.garden];
        });
        return response.garden;
      } else {
        console.error('Invalid garden data structure:', response);
        setError('Dữ liệu vườn không hợp lệ');
        return null;
      }
    } catch (error) {
      console.error('Error in getGardenById:', error);
      setError(error.response?.data?.message || 'Không thể tải dữ liệu vườn');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createGarden = async (gardenData) => {
    try {
      setLoading(true);
      const data = await gardenService.createGarden(gardenData);
      setGardens([...gardens, data.garden]);
      setCurrentGarden(data.garden);
      return data.garden;
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo vườn mới');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateGarden = async (gardenId, gardenData) => {
    try {
      setLoading(true);
      const data = await gardenService.updateGarden(gardenId, gardenData);
      const updatedGardens = gardens.map(garden => 
        garden._id === gardenId ? data.garden : garden
      );
      setGardens(updatedGardens);
      if (currentGarden && currentGarden._id === gardenId) {
        setCurrentGarden(data.garden);
      }
      return data.garden;
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật vườn');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteGarden = async (gardenId) => {
    try {
      setLoading(true);
      await gardenService.deleteGarden(gardenId);
      const updatedGardens = gardens.filter(garden => garden._id !== gardenId);
      setGardens(updatedGardens);
      if (currentGarden && currentGarden._id === gardenId) {
        setCurrentGarden(updatedGardens.length > 0 ? updatedGardens[0] : null);
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa vườn');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifySerial = async (deviceSerial) => {
    try {
      setLoading(true);
      const data = await gardenService.verifySerial(deviceSerial);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Mã serial không hợp lệ');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (gardenId, settings) => {
    try {
      setLoading(true);
      const data = await gardenService.updateSettings(gardenId, settings);
      if (currentGarden && currentGarden._id === gardenId) {
        setCurrentGarden({...currentGarden, settings: data.settings});
      }
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật cài đặt');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    gardens,
    currentGarden,
    setCurrentGarden,
    loading,
    error,
    fetchGardens,
    getGardenById,
    createGarden,
    updateGarden,
    deleteGarden,
    verifySerial,
    updateSettings,
  };

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}; 
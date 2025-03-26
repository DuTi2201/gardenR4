import React, { useEffect, useState } from 'react';
import { sensorService, analysisService, imageService } from '../../services';

const GardenDetail = () => {
  const [gardenId, setGardenId] = useState('');
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState('');
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState('');

  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        setLoading(true);
        const data = await sensorService.getLatestData(gardenId);
        setSensorData(data.data.latestSensorData);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        if (error.response?.status === 404) {
          setError('Chưa có dữ liệu cảm biến. Vui lòng kết nối thiết bị hoặc thử lại sau.');
        } else {
          setError('Không thể tải dữ liệu cảm biến. Vui lòng thử lại sau.');
        }
        console.error('Error fetching sensor data:', error);
      }
    };

    fetchSensorData();
  }, [gardenId]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setAnalysisLoading(true);
        const data = await analysisService.getLatestAnalysis(gardenId);
        setAnalysis(data.data);
        setAnalysisLoading(false);
      } catch (error) {
        setAnalysisLoading(false);
        if (error.response?.status === 404) {
          setAnalysisError('Chưa có dữ liệu phân tích. Vui lòng phân tích vườn trước.');
        } else {
          setAnalysisError('Không thể tải dữ liệu phân tích. Vui lòng thử lại sau.');
        }
        console.error('Error fetching analysis:', error);
      }
    };

    fetchAnalysis();
  }, [gardenId]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setImagesLoading(true);
        const data = await imageService.getImages(gardenId);
        setImages(data.data.images);
        setImagesLoading(false);
      } catch (error) {
        setImagesLoading(false);
        if (error.response?.status === 404) {
          setImagesError('Không tìm thấy hình ảnh nào.');
        } else {
          setImagesError('Không thể tải hình ảnh. Vui lòng thử lại sau.');
        }
        console.error('Error fetching images:', error);
      }
    };

    fetchImages();
  }, [gardenId]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default GardenDetail; 
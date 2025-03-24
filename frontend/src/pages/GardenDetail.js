import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import { useSocket } from '../context/SocketContext';
import MainLayout from '../components/Layout/MainLayout';
import { sensorService, deviceService, imageService, analysisService } from '../services';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  Button,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  PhotoCamera as PhotoCameraIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const GardenDetail = () => {
  const { gardenId } = useParams();
  const navigate = useNavigate();
  const { getGardenById } = useGarden();
  const { joinGardenRoom, subscribe, unsubscribe } = useSocket();
  
  const [garden, setGarden] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const [deviceStates, setDeviceStates] = useState({
    fan: false,
    light: false,
    pump: false,
    pump2: false,
    auto: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [latestImage, setLatestImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [openAddDevice, setOpenAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    device_id: '',
    type: 'PUMP', // Giá trị mặc định
    description: ''
  });

  useEffect(() => {
    if (gardenId) {
      loadGardenData();
      joinGardenRoom(gardenId);

      // Đăng ký lắng nghe sự kiện cập nhật dữ liệu cảm biến
      subscribe('sensor_data_update', handleSensorDataUpdate);

      // Đăng ký lắng nghe sự kiện cập nhật trạng thái thiết bị
      subscribe('device_status_update', handleDeviceStatusUpdate);

      return () => {
        unsubscribe('sensor_data_update', handleSensorDataUpdate);
        unsubscribe('device_status_update', handleDeviceStatusUpdate);
      };
    }
  }, [gardenId]);

  const loadGardenData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lấy thông tin chi tiết vườn
      const gardenData = await getGardenById(gardenId);
      setGarden(gardenData);

      // Lấy dữ liệu cảm biến mới nhất
      const sensorResponse = await sensorService.getLatestData(gardenId);
      setSensorData(sensorResponse.data);

      // Lấy trạng thái thiết bị
      const deviceResponse = await deviceService.getDevices(gardenId);
      setDeviceStates({
        fan: deviceResponse.devices.fan,
        light: deviceResponse.devices.light,
        pump: deviceResponse.devices.pump,
        pump2: deviceResponse.devices.pump2,
        auto: deviceResponse.devices.auto,
      });

      // Lấy hình ảnh mới nhất
      if (gardenData.has_camera) {
        try {
          const imageResponse = await imageService.getImages(gardenId, { limit: 1 });
          if (imageResponse.images && imageResponse.images.length > 0) {
            setLatestImage(imageResponse.images[0]);
          }
        } catch (err) {
          console.error('Lỗi khi tải hình ảnh:', err);
        }
      }

      // Lấy phân tích mới nhất
      try {
        const analysisResponse = await analysisService.getLatestAnalysis(gardenId);
        setAnalysis(analysisResponse.analysis);
      } catch (err) {
        console.error('Lỗi khi tải phân tích:', err);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu vườn:', err);
      setError(err.response?.data?.message || 'Không thể tải dữ liệu vườn. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSensorDataUpdate = (data) => {
    setSensorData(data);
  };

  const handleDeviceStatusUpdate = (data) => {
    setDeviceStates(prevState => ({
      ...prevState,
      [data.device.toLowerCase()]: data.state,
    }));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCaptureImage = async () => {
    if (!garden || !garden.has_camera) return;

    try {
      setCaptureLoading(true);
      await imageService.captureImage(gardenId);
      // Thường sau khi chụp ảnh, cần đợi một lúc để xử lý và lưu trữ
      setTimeout(async () => {
        try {
          const imageResponse = await imageService.getImages(gardenId, { limit: 1 });
          if (imageResponse.images && imageResponse.images.length > 0) {
            setLatestImage(imageResponse.images[0]);
          }
        } catch (err) {
          console.error('Lỗi khi tải hình ảnh mới:', err);
        } finally {
          setCaptureLoading(false);
        }
      }, 5000); // Đợi 5 giây
    } catch (err) {
      console.error('Lỗi khi chụp ảnh:', err);
      setCaptureLoading(false);
    }
  };

  const handleAnalyzeGarden = async () => {
    try {
      setAnalysisLoading(true);
      const response = await analysisService.analyzeGarden(gardenId);
      setAnalysis(response.analysis);
    } catch (err) {
      console.error('Lỗi khi phân tích vườn:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleDeviceControl = async (device, state) => {
    try {
      // Sử dụng device.device_id nếu là object, ngược lại sử dụng trực tiếp device
      const deviceId = device.device_id || device;
      await deviceService.controlDevice(gardenId, deviceId, state);
      
      // Cập nhật trạng thái thiết bị sau khi gửi lệnh thành công
      setDeviceStates(prevState => ({
        ...prevState,
        [deviceId.toLowerCase()]: state,
      }));
    } catch (err) {
      console.error(`Lỗi khi điều khiển thiết bị ${device}:`, err);
    }
  };

  const handleAutoModeToggle = async () => {
    try {
      const newState = !deviceStates.auto;
      // Sử dụng API thresholds để bật/tắt chế độ tự động
      await deviceService.setAutoMode(gardenId, newState);
      
      // Cập nhật trạng thái chế độ tự động
      setDeviceStates(prevState => ({
        ...prevState,
        auto: newState,
      }));
    } catch (err) {
      console.error('Lỗi khi bật/tắt chế độ tự động:', err);
    }
  };

  const handleAddDevice = async () => {
    try {
      await deviceService.addDevice(gardenId, newDevice);
      setOpenAddDevice(false);
      setNewDevice({
        name: '',
        device_id: '',
        type: 'PUMP',
        description: ''
      });
      // Làm mới dữ liệu vườn để hiển thị thiết bị mới
      loadGardenData();
    } catch (err) {
      console.error('Lỗi khi thêm thiết bị:', err);
      setError(err.response?.data?.message || 'Không thể thêm thiết bị. Vui lòng thử lại sau.');
    }
  };

  const handleDeviceInputChange = (e) => {
    const { name, value } = e.target;
    setNewDevice(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error || !garden) {
    return (
      <MainLayout>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Không tìm thấy thông tin vườn'}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/gardens')}
          sx={{ mt: 2 }}
        >
          Quay lại danh sách vườn
        </Button>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Grid item xs>
            <Typography variant="h4" component="h1">
              {garden.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Mã thiết bị: {garden.device_serial} | 
              {garden.has_camera ? ' Có camera' : ' Không có camera'}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/gardens/${gardenId}/edit`)}
              sx={{ mr: 1 }}
            >
              Chỉnh sửa
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadGardenData}
            >
              Làm mới
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Tổng quan" />
            <Tab label="Cảm biến" />
            <Tab label="Điều khiển" />
            {garden.has_camera && <Tab label="Camera" />}
            <Tab label="Phân tích" />
            <Tab label="Cài đặt" />
          </Tabs>
        </Box>

        {/* Nội dung tab */}
        <div role="tabpanel" hidden={tabValue !== 0}>
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={garden.has_camera ? 8 : 12}>
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Thông tin vườn
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body1" paragraph>
                    {garden.description || 'Không có mô tả'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Ngày tạo:</strong> {new Date(garden.created_at).toLocaleDateString('vi-VN')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Kết nối cuối:</strong> {garden.last_connected ? new Date(garden.last_connected).toLocaleString('vi-VN') : 'Chưa kết nối'}
                  </Typography>
                </Paper>
                
                {/* Hiển thị dữ liệu cảm biến */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Nhiệt độ & Độ ẩm
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {sensorData?.temperature || '--'}°C
                        </Typography>
                        <Typography variant="body1">
                          Độ ẩm: {sensorData?.humidity || '--'}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Ánh sáng & Độ ẩm đất
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {sensorData?.light || '--'}%
                        </Typography>
                        <Typography variant="body1">
                          Độ ẩm đất: {sensorData?.soil || '--'}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
              
              {garden.has_camera && (
                <Grid item xs={12} md={4}>
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Hình ảnh mới nhất
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {latestImage ? (
                      <Box sx={{ mb: 2 }}>
                        <img 
                          src={latestImage.url} 
                          alt="Hình ảnh vườn" 
                          style={{ width: '100%', borderRadius: 4 }}
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Chụp vào: {new Date(latestImage.timestamp).toLocaleString('vi-VN')}
                        </Typography>
                      </Box>
                    ) : (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Chưa có hình ảnh nào. Hãy chụp ảnh mới!
                      </Alert>
                    )}
                    <Button
                      variant="contained"
                      startIcon={<PhotoCameraIcon />}
                      onClick={handleCaptureImage}
                      disabled={captureLoading}
                      fullWidth
                    >
                      {captureLoading ? 'Đang chụp...' : 'Chụp ảnh mới'}
                    </Button>
                  </Paper>
                </Grid>
              )}
              
              {/* Phân tích vườn */}
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Phân tích vườn
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<BarChartIcon />}
                      onClick={handleAnalyzeGarden}
                      disabled={analysisLoading}
                    >
                      {analysisLoading ? 'Đang phân tích...' : 'Phân tích mới'}
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  
                  {analysis ? (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        <strong>Thời gian phân tích:</strong> {new Date(analysis.timestamp).toLocaleString('vi-VN')}
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {analysis.result?.summary || 'Không có thông tin phân tích'}
                      </Typography>
                      {analysis.result?.recommendations && (
                        <>
                          <Typography variant="subtitle1" gutterBottom>
                            <strong>Đề xuất:</strong>
                          </Typography>
                          <ul>
                            {analysis.result.recommendations.map((rec, index) => (
                              <li key={index}>
                                <Typography variant="body1">{rec}</Typography>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      Chưa có phân tích nào. Hãy thực hiện phân tích mới!
                    </Alert>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </div>
        
        {/* Tab điều khiển thiết bị */}
        <div role="tabpanel" hidden={tabValue !== 2}>
          {tabValue === 2 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                Điều khiển thiết bị
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={deviceStates.auto}
                      onChange={handleAutoModeToggle}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      Chế độ tự động
                    </Typography>
                  }
                />
                {deviceStates.auto && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Chế độ tự động đang bật. Các thiết bị sẽ tự động điều chỉnh dựa trên dữ liệu cảm biến.
                  </Alert>
                )}
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Quạt
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        Trạng thái: <strong>{deviceStates.fan ? 'BẬT' : 'TẮT'}</strong>
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        disabled={deviceStates.auto || deviceStates.fan}
                        onClick={() => handleDeviceControl({device_id: 'FAN', category: 'FAN'}, true)}
                        fullWidth
                      >
                        BẬT
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        disabled={deviceStates.auto || !deviceStates.fan}
                        onClick={() => handleDeviceControl({device_id: 'FAN', category: 'FAN'}, false)}
                        fullWidth
                      >
                        TẮT
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Đèn
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        Trạng thái: <strong>{deviceStates.light ? 'BẬT' : 'TẮT'}</strong>
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        disabled={deviceStates.auto || deviceStates.light}
                        onClick={() => handleDeviceControl({device_id: 'LIGHT', category: 'LIGHT'}, true)}
                        fullWidth
                      >
                        BẬT
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        disabled={deviceStates.auto || !deviceStates.light}
                        onClick={() => handleDeviceControl({device_id: 'LIGHT', category: 'LIGHT'}, false)}
                        fullWidth
                      >
                        TẮT
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Máy bơm 1
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        Trạng thái: <strong>{deviceStates.pump ? 'BẬT' : 'TẮT'}</strong>
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        disabled={deviceStates.auto || deviceStates.pump}
                        onClick={() => handleDeviceControl({device_id: 'PUMP', category: 'PUMP'}, true)}
                        fullWidth
                      >
                        BẬT
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        disabled={deviceStates.auto || !deviceStates.pump}
                        onClick={() => handleDeviceControl({device_id: 'PUMP', category: 'PUMP'}, false)}
                        fullWidth
                      >
                        TẮT
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Máy bơm 2
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        Trạng thái: <strong>{deviceStates.pump2 ? 'BẬT' : 'TẮT'}</strong>
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        disabled={deviceStates.auto || deviceStates.pump2}
                        onClick={() => handleDeviceControl({device_id: 'PUMP_2', category: 'PUMP_2'}, true)}
                        fullWidth
                      >
                        BẬT
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        disabled={deviceStates.auto || !deviceStates.pump2}
                        onClick={() => handleDeviceControl({device_id: 'PUMP_2', category: 'PUMP_2'}, false)}
                        fullWidth
                      >
                        TẮT
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </div>
      </Container>
    </MainLayout>
  );
};

export default GardenDetail; 
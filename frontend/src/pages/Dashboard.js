import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/Layout/MainLayout';
import { sensorService, deviceService } from '../services';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Thermostat,
  Opacity,
  WbSunny,
  AirOutlined,
  SettingsInputAntenna,
  Grass,
  WaterDrop,
  GrassOutlined,
  AdminPanelSettings,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Đăng ký các components của Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentGarden, gardens, loading: gardensLoading, error: gardensError } = useGarden();
  const { subscribe, unsubscribe, joinGardenRoom } = useSocket();
  const { currentUser } = useAuth();
  
  const [selectedGarden, setSelectedGarden] = useState(null);
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
  const [chartData, setChartData] = useState(null);

  // Kiểm tra xem người dùng có phải admin hay không
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.email === 'admin@smartgarden.com');

  useEffect(() => {
    if (currentGarden) {
      setSelectedGarden(currentGarden);
    } else if (gardens.length > 0) {
      setSelectedGarden(gardens[0]);
    }
  }, [currentGarden, gardens]);

  useEffect(() => {
    if (selectedGarden) {
      loadData();
      joinGardenRoom(selectedGarden._id);

      // Đăng ký lắng nghe sự kiện cập nhật dữ liệu cảm biến
      subscribe('sensor_data_update', handleSensorDataUpdate);

      // Đăng ký lắng nghe sự kiện cập nhật trạng thái thiết bị
      subscribe('device_status_update', handleDeviceStatusUpdate);

      return () => {
        unsubscribe('sensor_data_update', handleSensorDataUpdate);
        unsubscribe('device_status_update', handleDeviceStatusUpdate);
      };
    }
  }, [selectedGarden]);

  const loadData = async () => {
    if (!selectedGarden) return;

    try {
      setLoading(true);
      setError(null);

      // Lấy dữ liệu cảm biến mới nhất
      const sensorResponse = await sensorService.getLatestData(selectedGarden._id);
      setSensorData(sensorResponse.data);

      // Lấy trạng thái thiết bị
      const deviceResponse = await deviceService.getDevices(selectedGarden._id);
      setDeviceStates({
        fan: deviceResponse.devices.fan,
        light: deviceResponse.devices.light,
        pump: deviceResponse.devices.pump,
        pump2: deviceResponse.devices.pump2,
        auto: deviceResponse.devices.auto,
      });

      // Lấy dữ liệu lịch sử cho biểu đồ
      const historyResponse = await sensorService.getDataHistory(selectedGarden._id, {
        limit: 24,
      });

      prepareChartData(historyResponse.data);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
      setError(err.response?.data?.message || 'Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (historyData) => {
    if (!historyData || !historyData.length) return;

    // Đảo ngược mảng để hiển thị dữ liệu theo thứ tự thời gian
    const data = [...historyData].reverse();

    const labels = data.map(item => {
      const date = new Date(item.timestamp);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Nhiệt độ (°C)',
          data: data.map(item => item.temperature),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Độ ẩm không khí (%)',
          data: data.map(item => item.humidity),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Ánh sáng (%)',
          data: data.map(item => item.light),
          borderColor: 'rgb(255, 205, 86)',
          backgroundColor: 'rgba(255, 205, 86, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Độ ẩm đất (%)',
          data: data.map(item => item.soil),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y',
        },
      ],
    };

    setChartData(chartData);
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

  const handleGardenChange = (event) => {
    const gardenId = event.target.value;
    const garden = gardens.find(g => g._id === gardenId);
    setSelectedGarden(garden);
  };

  const handleDeviceControl = async (device, state) => {
    if (!selectedGarden) return;
    
    try {
      await deviceService.controlDevice(selectedGarden._id, device, state);
      
      // Cập nhật trạng thái thiết bị sau khi gửi lệnh thành công
      setDeviceStates(prevState => ({
        ...prevState,
        [device.toLowerCase()]: state,
      }));
    } catch (err) {
      console.error(`Lỗi khi điều khiển thiết bị ${device}:`, err);
      setError(err.response?.data?.message || 'Không thể điều khiển thiết bị. Vui lòng thử lại sau.');
    }
  };

  const handleAutoModeToggle = async () => {
    if (!selectedGarden) return;
    
    try {
      const newState = !deviceStates.auto;
      await deviceService.setAutoMode(selectedGarden._id, newState);
      
      // Cập nhật trạng thái chế độ tự động
      setDeviceStates(prevState => ({
        ...prevState,
        auto: newState,
      }));
    } catch (err) {
      console.error('Lỗi khi bật/tắt chế độ tự động:', err);
      setError(err.response?.data?.message || 'Không thể thay đổi chế độ tự động. Vui lòng thử lại sau.');
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  if (gardensLoading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (gardensError) {
    return (
      <MainLayout>
        <Alert severity="error" sx={{ mt: 2 }}>
          {gardensError}
        </Alert>
      </MainLayout>
    );
  }

  if (gardens.length === 0) {
    return (
      <MainLayout>
        <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', mt: 4 }}>
          <Alert severity="info" sx={{ mb: 4 }}>
            Bạn chưa có vườn nào. Hãy tạo vườn mới để bắt đầu!
          </Alert>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/gardens/new')}
          >
            Tạo vườn mới
          </Button>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" component="h1" gutterBottom>
                Bảng điều khiển
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                {isAdmin && (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<AdminPanelSettings />}
                    onClick={() => navigate('/admin')}
                    sx={{ mr: 2 }}
                  >
                    Quản trị hệ thống
                  </Button>
                )}
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="garden-select-label">Chọn vườn</InputLabel>
                  <Select
                    labelId="garden-select-label"
                    id="garden-select"
                    value={selectedGarden?._id || ''}
                    label="Chọn vườn"
                    onChange={handleGardenChange}
                  >
                    {gardens.map((garden) => (
                      <MenuItem key={garden._id} value={garden._id}>
                        {garden.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button 
                  variant="outlined" 
                  onClick={handleRefresh}
                  sx={{ ml: 2 }}
                  disabled={loading}
                >
                  Làm mới
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Dữ liệu cảm biến */}
            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
              Dữ liệu cảm biến
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Thermostat color="error" fontSize="large" sx={{ mr: 1 }} />
                    <Typography variant="h6">Nhiệt độ</Typography>
                  </Box>
                  <Typography variant="h3" color="text.primary" align="center">
                    {sensorData?.temperature || '--'} °C
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Opacity color="primary" fontSize="large" sx={{ mr: 1 }} />
                    <Typography variant="h6">Độ ẩm</Typography>
                  </Box>
                  <Typography variant="h3" color="text.primary" align="center">
                    {sensorData?.humidity || '--'} %
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WbSunny color="warning" fontSize="large" sx={{ mr: 1 }} />
                    <Typography variant="h6">Ánh sáng</Typography>
                  </Box>
                  <Typography variant="h3" color="text.primary" align="center">
                    {sensorData?.light || '--'} %
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <GrassOutlined color="success" fontSize="large" sx={{ mr: 1 }} />
                    <Typography variant="h6">Độ ẩm đất</Typography>
                  </Box>
                  <Typography variant="h3" color="text.primary" align="center">
                    {sensorData?.soil || '--'} %
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Bảng điều khiển thiết bị */}
            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
              Điều khiển thiết bị
            </Typography>
            <Divider sx={{ mb: 2 }} />
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
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AirOutlined fontSize="large" sx={{ mr: 1 }} />
                      <Typography variant="h6">Quạt</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Trạng thái: <strong>{deviceStates.fan ? 'BẬT' : 'TẮT'}</strong>
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      disabled={deviceStates.auto || deviceStates.fan}
                      onClick={() => handleDeviceControl('FAN', true)}
                      fullWidth
                    >
                      BẬT
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      disabled={deviceStates.auto || !deviceStates.fan}
                      onClick={() => handleDeviceControl('FAN', false)}
                      fullWidth
                    >
                      TẮT
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <WbSunny fontSize="large" sx={{ mr: 1 }} />
                      <Typography variant="h6">Đèn</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Trạng thái: <strong>{deviceStates.light ? 'BẬT' : 'TẮT'}</strong>
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      disabled={deviceStates.auto || deviceStates.light}
                      onClick={() => handleDeviceControl('LIGHT', true)}
                      fullWidth
                    >
                      BẬT
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      disabled={deviceStates.auto || !deviceStates.light}
                      onClick={() => handleDeviceControl('LIGHT', false)}
                      fullWidth
                    >
                      TẮT
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <WaterDrop fontSize="large" sx={{ mr: 1 }} />
                      <Typography variant="h6">Máy bơm 1</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Trạng thái: <strong>{deviceStates.pump ? 'BẬT' : 'TẮT'}</strong>
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      disabled={deviceStates.auto || deviceStates.pump}
                      onClick={() => handleDeviceControl('PUMP', true)}
                      fullWidth
                    >
                      BẬT
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      disabled={deviceStates.auto || !deviceStates.pump}
                      onClick={() => handleDeviceControl('PUMP', false)}
                      fullWidth
                    >
                      TẮT
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Grass fontSize="large" sx={{ mr: 1 }} />
                      <Typography variant="h6">Máy bơm 2</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Trạng thái: <strong>{deviceStates.pump2 ? 'BẬT' : 'TẮT'}</strong>
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      disabled={deviceStates.auto || deviceStates.pump2}
                      onClick={() => handleDeviceControl('PUMP_2', true)}
                      fullWidth
                    >
                      BẬT
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      disabled={deviceStates.auto || !deviceStates.pump2}
                      onClick={() => handleDeviceControl('PUMP_2', false)}
                      fullWidth
                    >
                      TẮT
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>

            {/* Biểu đồ */}
            {chartData && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Biểu đồ dữ liệu 24 giờ qua
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Paper sx={{ p: 2 }}>
                  <Line 
                    data={chartData} 
                    options={{
                      responsive: true,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                        },
                      },
                    }}
                  />
                </Paper>
              </Box>
            )}
          </>
        )}
      </Container>
    </MainLayout>
  );
};

export default Dashboard; 
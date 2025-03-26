import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/Layout/MainLayout';
import ConnectionStatus from '../components/ConnectionStatus';
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
  Skeleton,
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

// Phần hiển thị dữ liệu cảm biến
const SensorDataDisplay = ({ title, value, unit, icon, isLoading }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h6">{title}</Typography>
      </Box>
      <Typography variant="h3" color="text.primary" align="center">
        {isLoading ? (
          <Skeleton animation="wave" height={60} width="80%" style={{ margin: '0 auto' }} />
        ) : (
          `${value || '--'} ${unit}`
        )}
      </Typography>
    </Paper>
  </Grid>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentGarden, gardens, loading: gardensLoading, error: gardensError } = useGarden();
  const { subscribe, unsubscribe, joinGardenRoom } = useSocket();
  const { currentUser } = useAuth();
  const refreshTimerRef = useRef(null);
  
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [sensorData, setSensorData] = useState(() => {
    // Lấy dữ liệu từ localStorage nếu có
    return null;
  });
  const [deviceStates, setDeviceStates] = useState(() => {
    // Lấy trạng thái thiết bị từ localStorage nếu có
    return {
      fan: false,
      light: false,
      pump: false,
      pump2: false,
      auto: false,
    };
  });
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true); // Trạng thái loading riêng cho dữ liệu cảm biến
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Thêm state để theo dõi thời gian đếm ngược cho mỗi thiết bị
  const [cooldowns, setCooldowns] = useState({
    FAN: 0,
    LIGHT: 0,
    PUMP: 0,
    PUMP_2: 0
  });

  // Thêm ref để lưu trữ các interval timer
  const cooldownTimersRef = useRef({});

  // Kiểm tra xem người dùng có phải admin hay không
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.email === 'admin@smartgarden.com');

  useEffect(() => {
    if (currentGarden) {
      setSelectedGarden(currentGarden);
    } else if (gardens.length > 0) {
      setSelectedGarden(gardens[0]);
    }
  }, [currentGarden, gardens]);

  // Thiết lập timer để tự động làm mới dữ liệu
  useEffect(() => {
    // Khởi tạo timer làm mới mỗi 60 giây
    if (selectedGarden) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      
      refreshTimerRef.current = setInterval(() => {
        // Nếu dữ liệu không được cập nhật trong hơn 60 giây, thực hiện làm mới
        const now = new Date();
        if (lastUpdated && (now - lastUpdated) > 60000) {
          console.log('Đã hơn 60 giây không nhận được dữ liệu, tự động làm mới...');
          loadData();
        }
      }, 60000);
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [selectedGarden, lastUpdated]);

  // Tải dữ liệu từ localStorage dựa vào garden được chọn
  useEffect(() => {
    if (selectedGarden) {
      const gardenId = selectedGarden._id;
      // Tải dữ liệu theo garden_id
      const savedSensorData = localStorage.getItem(`sensorData_${gardenId}`);
      const savedDeviceStates = localStorage.getItem(`deviceStates_${gardenId}`);
      
      if (savedSensorData) {
        setSensorData(JSON.parse(savedSensorData));
        setDataLoading(false); // Không cần loading nếu đã có dữ liệu
      }
      
      if (savedDeviceStates) {
        setDeviceStates(JSON.parse(savedDeviceStates));
      }
      
      loadData();
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
  }, [selectedGarden]);

  // Lưu dữ liệu cảm biến vào localStorage khi có thay đổi
  useEffect(() => {
    if (sensorData && selectedGarden) {
      localStorage.setItem(`sensorData_${selectedGarden._id}`, JSON.stringify(sensorData));
      setLastUpdated(new Date());
    }
  }, [sensorData, selectedGarden]);

  // Lưu trạng thái thiết bị vào localStorage khi có thay đổi
  useEffect(() => {
    if (selectedGarden) {
      localStorage.setItem(`deviceStates_${selectedGarden._id}`, JSON.stringify(deviceStates));
    }
  }, [deviceStates, selectedGarden]);

  const loadData = async () => {
    if (!selectedGarden) return;

    try {
      setLoading(true);
      if (!sensorData) setDataLoading(true);
      setError(null);

      // Lấy dữ liệu cảm biến mới nhất
      const sensorResponse = await sensorService.getLatestData(selectedGarden._id);
      if (sensorResponse.data) {
        setSensorData(sensorResponse.data);
        setLastUpdated(new Date());
      }

      // Lấy trạng thái thiết bị
      const deviceResponse = await deviceService.getDevices(selectedGarden._id);
      setDeviceStates({
        fan: deviceResponse.devices.fan,
        light: deviceResponse.devices.light,
        pump: deviceResponse.devices.pump,
        pump2: deviceResponse.devices.pump2,
        auto: deviceResponse.devices.auto_mode,
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
      setDataLoading(false);
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
    console.log("Nhận dữ liệu cảm biến từ socket:", data);
    setSensorData(data);
    setDataLoading(false);
    setLastUpdated(new Date());
  };

  const handleDeviceStatusUpdate = (data) => {
    console.log("Nhận cập nhật trạng thái thiết bị từ socket:", data);
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
    
    // Kiểm tra nếu thiết bị đang trong thời gian đếm ngược
    if (cooldowns[device] > 0) {
      setError(`Vui lòng đợi ${cooldowns[device]} giây nữa để điều khiển ${device}`);
      return;
    }
    
    try {
      console.log(`Gửi lệnh điều khiển: garden=${selectedGarden._id}, device=${device}, state=${state}`);
      const response = await deviceService.controlDevice(selectedGarden._id, device, state);
      console.log('Response from device control:', response);
      
      // Cập nhật trạng thái thiết bị sau khi gửi lệnh thành công
      setDeviceStates(prevState => ({
        ...prevState,
        [device.toLowerCase()]: state,
      }));
      
      // Bắt đầu đếm ngược 20 giây cho thiết bị này
      setCooldowns(prevCooldowns => ({
        ...prevCooldowns,
        [device]: 20
      }));
      
      // Tạo interval để đếm ngược
      if (cooldownTimersRef.current[device]) {
        clearInterval(cooldownTimersRef.current[device]);
      }
      
      cooldownTimersRef.current[device] = setInterval(() => {
        setCooldowns(prevCooldowns => {
          const newCooldown = prevCooldowns[device] - 1;
          
          // Xóa interval khi đếm ngược về 0
          if (newCooldown <= 0) {
            clearInterval(cooldownTimersRef.current[device]);
            cooldownTimersRef.current[device] = null;
          }
          
          return {
            ...prevCooldowns,
            [device]: Math.max(0, newCooldown)
          };
        });
      }, 1000);
      
    } catch (err) {
      console.error(`Lỗi khi điều khiển thiết bị ${device}:`, err);
      console.log('Request config:', err?.config);
      console.log('Response data:', err?.response?.data);
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

  // Xóa các interval khi component unmount
  useEffect(() => {
    return () => {
      Object.values(cooldownTimersRef.current).forEach(timer => {
        if (timer) clearInterval(timer);
      });
    };
  }, []);

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
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Cập nhật lần cuối: {new Date(lastUpdated).toLocaleTimeString()}
                </Typography>
              )}
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
                    {gardens.map((garden) => garden && (
                      <MenuItem key={garden._id || 'unknown'} value={garden._id || 'unknown'}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                          <span>{garden.name || 'Chưa có tên'}</span>
                          <ConnectionStatus 
                            isConnected={garden.is_connected} 
                            lastConnected={garden.last_connected}
                            size="small"
                            variant="dot"
                            showText={false}
                          />
                        </Box>
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

        {loading && !dataLoading ? (
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
              <SensorDataDisplay 
                title="Nhiệt độ"
                value={sensorData?.temperature}
                unit="°C"
                icon={<Thermostat color="error" fontSize="large" sx={{ mr: 1 }} />}
                isLoading={dataLoading}
              />
              <SensorDataDisplay 
                title="Độ ẩm"
                value={sensorData?.humidity}
                unit="%"
                icon={<Opacity color="primary" fontSize="large" sx={{ mr: 1 }} />}
                isLoading={dataLoading}
              />
              <SensorDataDisplay 
                title="Ánh sáng"
                value={sensorData?.light}
                unit="%"
                icon={<WbSunny color="warning" fontSize="large" sx={{ mr: 1 }} />}
                isLoading={dataLoading}
              />
              <SensorDataDisplay 
                title="Độ ẩm đất"
                value={sensorData?.soil}
                unit="%"
                icon={<GrassOutlined color="success" fontSize="large" sx={{ mr: 1 }} />}
                isLoading={dataLoading}
              />
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
                    {cooldowns.FAN > 0 && (
                      <Typography variant="body2" color="warning.main">
                        Đang chờ: {cooldowns.FAN}s
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      disabled={deviceStates.auto || deviceStates.fan || cooldowns.FAN > 0}
                      onClick={() => handleDeviceControl('FAN', true)}
                      fullWidth
                    >
                      BẬT
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      disabled={deviceStates.auto || !deviceStates.fan || cooldowns.FAN > 0}
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
                    {cooldowns.LIGHT > 0 && (
                      <Typography variant="body2" color="warning.main">
                        Đang chờ: {cooldowns.LIGHT}s
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      disabled={deviceStates.auto || deviceStates.light || cooldowns.LIGHT > 0}
                      onClick={() => handleDeviceControl('LIGHT', true)}
                      fullWidth
                    >
                      BẬT
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      disabled={deviceStates.auto || !deviceStates.light || cooldowns.LIGHT > 0}
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
                    {cooldowns.PUMP > 0 && (
                      <Typography variant="body2" color="warning.main">
                        Đang chờ: {cooldowns.PUMP}s
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      disabled={deviceStates.auto || deviceStates.pump || cooldowns.PUMP > 0}
                      onClick={() => handleDeviceControl('PUMP', true)}
                      fullWidth
                    >
                      BẬT
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      disabled={deviceStates.auto || !deviceStates.pump || cooldowns.PUMP > 0}
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
                    {cooldowns.PUMP_2 > 0 && (
                      <Typography variant="body2" color="warning.main">
                        Đang chờ: {cooldowns.PUMP_2}s
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      disabled={deviceStates.auto || deviceStates.pump2 || cooldowns.PUMP_2 > 0}
                      onClick={() => handleDeviceControl('PUMP_2', true)}
                      fullWidth
                    >
                      BẬT
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      disabled={deviceStates.auto || !deviceStates.pump2 || cooldowns.PUMP_2 > 0}
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
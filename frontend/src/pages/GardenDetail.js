import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import { useSocket } from '../context/SocketContext';
import MainLayout from '../components/Layout/MainLayout';
import { sensorService, deviceService, imageService, analysisService, scheduleService } from '../services';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  PhotoCamera as PhotoCameraIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
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
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [openAddSchedule, setOpenAddSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    device: 'PUMP',
    hour: 8,
    minute: 0,
    action: true, // true = bật, false = tắt
    active: true,
    days: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true
    }
  });
  const [editSchedule, setEditSchedule] = useState(null);
  const [openEditSchedule, setOpenEditSchedule] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastConnected, setLastConnected] = useState(null);
  const [createdDate, setCreatedDate] = useState(null);
  const [lastConnectedDate, setLastConnectedDate] = useState(null);

  useEffect(() => {
    if (gardenId) {
      loadGardenData();
      joinGardenRoom(gardenId);

      // Đăng ký lắng nghe sự kiện cập nhật dữ liệu cảm biến
      subscribe('sensor_data_update', handleSensorDataUpdate);

      // Đăng ký lắng nghe sự kiện cập nhật trạng thái thiết bị
      subscribe('device_status_update', handleDeviceStatusUpdate);

      // Đăng ký lắng nghe sự kiện kết nối/ngắt kết nối
      subscribe('device_connection_status', handleConnectionStatus);

      return () => {
        unsubscribe('sensor_data_update', handleSensorDataUpdate);
        unsubscribe('device_status_update', handleDeviceStatusUpdate);
        unsubscribe('device_connection_status', handleConnectionStatus);
      };
    }
  }, [gardenId]);

  const handleConnectionStatus = (data) => {
    setIsOffline(!data.connected);
    if (data.connected) {
      setLastConnected(new Date());
    }
  };

  const loadGardenData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading garden data for ID:', gardenId);

      // Lấy thông tin vườn
      const gardenData = await getGardenById(gardenId);
      console.log('Garden data:', gardenData);

      // Kiểm tra và set garden data an toàn
      if (gardenData && gardenData.garden) {
        // Giữ nguyên dữ liệu gốc từ database
        setGarden(gardenData.garden);
        
        // Xử lý ngày tạo và kết nối cuối an toàn
        if (gardenData.garden.created_at) {
          try {
            setCreatedDate(new Date(gardenData.garden.created_at));
          } catch (e) {
            console.error('Lỗi khi xử lý ngày tạo:', e);
            setCreatedDate(null);
          }
        }
        
        if (gardenData.garden.last_connected) {
          try {
            const lastConnectedDate = new Date(gardenData.garden.last_connected);
            setLastConnectedDate(lastConnectedDate);
            const isOffline = (Date.now() - lastConnectedDate.getTime()) > 5 * 60 * 1000;
            setIsOffline(isOffline);
          } catch (e) {
            console.error('Lỗi khi xử lý ngày kết nối cuối:', e);
            setLastConnectedDate(null);
            setIsOffline(true);
          }
        } else {
          setIsOffline(true);
          setLastConnectedDate(null);
        }

        // Cập nhật dữ liệu cảm biến nếu có
        if (gardenData.garden.sensor_data) {
          setSensorData(gardenData.garden.sensor_data);
        } else {
          setSensorData(null);
        }

        // Cập nhật trạng thái thiết bị nếu có
        if (gardenData.garden.devices && gardenData.garden.devices.length > 0) {
          const deviceStates = {};
          gardenData.garden.devices.forEach(device => {
            deviceStates[device._id] = {
              status: device.status || false,
              last_connected: device.last_connected
            };
          });
          setDeviceStates(deviceStates);
        }
      } else {
        // Nếu không có dữ liệu vườn, set các giá trị mặc định
        setGarden({
          _id: gardenId,
          name: 'Chưa có tên vườn',
          description: 'Không có mô tả',
          device_serial: 'Chưa kết nối',
          last_connected: null,
          is_connected: false,
          has_camera: false,
          sensor_data: null,
          devices: []
        });
        setCreatedDate(null);
        setLastConnectedDate(null);
        setIsOffline(true);
        setSensorData(null);
        setDeviceStates({});
      }

      // Nếu không thành công, hiển thị thông báo lỗi nhưng vẫn giữ giao diện
      if (!gardenData.success) {
        setError(gardenData.message);
      }

    } catch (error) {
      console.error('Error loading garden data:', error);
      setError(error.message || 'Không thể tải dữ liệu vườn. Vui lòng thử lại sau.');
      
      // Set các giá trị mặc định khi có lỗi
      setGarden({
        _id: gardenId,
        name: 'Chưa có tên vườn',
        description: 'Không có mô tả',
        device_serial: 'Chưa kết nối',
        last_connected: null,
        is_connected: false,
        has_camera: false,
        sensor_data: null,
        devices: []
      });
      setCreatedDate(null);
      setLastConnectedDate(null);
      setIsOffline(true);
      setSensorData(null);
      setDeviceStates({});
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

  const handleCreateSchedule = async () => {
    try {
      await scheduleService.createSchedule(gardenId, newSchedule);
      setOpenAddSchedule(false);
      setNewSchedule({
        device: 'PUMP',
        hour: 8,
        minute: 0,
        action: true,
        active: true,
        days: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true
        }
      });
      // Làm mới danh sách lịch trình
      const schedulesResponse = await scheduleService.getSchedules(gardenId);
      if (schedulesResponse && schedulesResponse.data) {
        setSchedules(schedulesResponse.data);
      } else if (Array.isArray(schedulesResponse)) {
        setSchedules(schedulesResponse);
      }
    } catch (err) {
      console.error('Lỗi khi tạo lịch trình:', err);
      setError(err.response?.data?.message || 'Không thể tạo lịch trình. Vui lòng thử lại sau.');
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editSchedule || !editSchedule._id) return;
    
    try {
      await scheduleService.updateSchedule(gardenId, editSchedule._id, editSchedule);
      setOpenEditSchedule(false);
      
      // Làm mới danh sách lịch trình
      const schedulesResponse = await scheduleService.getSchedules(gardenId);
      if (schedulesResponse && schedulesResponse.data) {
        setSchedules(schedulesResponse.data);
      } else if (Array.isArray(schedulesResponse)) {
        setSchedules(schedulesResponse);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật lịch trình:', err);
      setError(err.response?.data?.message || 'Không thể cập nhật lịch trình. Vui lòng thử lại sau.');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!scheduleId) return;
    
    try {
      await scheduleService.deleteSchedule(gardenId, scheduleId);
      
      // Cập nhật danh sách lịch trình
      setSchedules(schedules.filter(schedule => schedule._id !== scheduleId));
    } catch (err) {
      console.error('Lỗi khi xóa lịch trình:', err);
      setError(err.response?.data?.message || 'Không thể xóa lịch trình. Vui lòng thử lại sau.');
    }
  };

  const handleScheduleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSchedule(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditScheduleInputChange = (e) => {
    const { name, value } = e.target;
    setEditSchedule(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditScheduleDayChange = (day) => {
    if (!editSchedule) return;
    
    setEditSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: !prev.days[day]
      }
    }));
  };

  const handleNewScheduleDayChange = (day) => {
    setNewSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: !prev.days[day]
      }
    }));
  };

  const renderScheduleManager = () => {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            Quản lý lịch trình
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddSchedule(true)}
          >
            Thêm lịch trình mới
          </Button>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        {schedules.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Chưa có lịch trình nào. Hãy thêm lịch trình mới để tự động hóa vườn của bạn!
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Thiết bị</TableCell>
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Hành động</TableCell>
                  <TableCell>Ngày trong tuần</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule._id}>
                    <TableCell>
                      {schedule.device === 'PUMP' ? 'Máy bơm 1' : 
                       schedule.device === 'PUMP_2' ? 'Máy bơm 2' : 
                       schedule.device === 'FAN' ? 'Quạt' : 
                       schedule.device === 'LIGHT' ? 'Đèn' : schedule.device}
                    </TableCell>
                    <TableCell>
                      {schedule.hour.toString().padStart(2, '0')}:{schedule.minute.toString().padStart(2, '0')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={schedule.action ? "BẬT" : "TẮT"}
                        color={schedule.action ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {Object.entries(schedule.days).filter(([_, value]) => value).map(([day]) => (
                        <Chip 
                          key={day}
                          label={day === 'monday' ? 'T2' : 
                                 day === 'tuesday' ? 'T3' : 
                                 day === 'wednesday' ? 'T4' : 
                                 day === 'thursday' ? 'T5' : 
                                 day === 'friday' ? 'T6' : 
                                 day === 'saturday' ? 'T7' : 'CN'}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={schedule.active ? "Đang hoạt động" : "Đã tắt"}
                        color={schedule.active ? "primary" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => {
                          setEditSchedule(schedule);
                          setOpenEditSchedule(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteSchedule(schedule._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog thêm lịch trình mới */}
        <Dialog open={openAddSchedule} onClose={() => setOpenAddSchedule(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Thêm lịch trình mới</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                select
                label="Thiết bị"
                name="device"
                value={newSchedule.device}
                onChange={handleScheduleInputChange}
                sx={{ mb: 2 }}
              >
                <MenuItem value="PUMP">Máy bơm 1</MenuItem>
                <MenuItem value="PUMP_2">Máy bơm 2</MenuItem>
                <MenuItem value="FAN">Quạt</MenuItem>
                <MenuItem value="LIGHT">Đèn</MenuItem>
              </TextField>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Giờ"
                  type="number"
                  name="hour"
                  value={newSchedule.hour}
                  onChange={handleScheduleInputChange}
                  inputProps={{ min: 0, max: 23 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Phút"
                  type="number"
                  name="minute"
                  value={newSchedule.minute}
                  onChange={handleScheduleInputChange}
                  inputProps={{ min: 0, max: 59 }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <TextField
                fullWidth
                select
                label="Hành động"
                name="action"
                value={newSchedule.action}
                onChange={handleScheduleInputChange}
                sx={{ mb: 2 }}
              >
                <MenuItem value={true}>BẬT thiết bị</MenuItem>
                <MenuItem value={false}>TẮT thiết bị</MenuItem>
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={newSchedule.active}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, active: e.target.checked }))}
                  />
                }
                label="Kích hoạt lịch trình"
              />

              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Các ngày trong tuần:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  label="Thứ 2"
                  color={newSchedule.days.monday ? "primary" : "default"}
                  onClick={() => handleNewScheduleDayChange('monday')}
                  variant={newSchedule.days.monday ? "filled" : "outlined"}
                />
                <Chip 
                  label="Thứ 3"
                  color={newSchedule.days.tuesday ? "primary" : "default"}
                  onClick={() => handleNewScheduleDayChange('tuesday')}
                  variant={newSchedule.days.tuesday ? "filled" : "outlined"}
                />
                <Chip 
                  label="Thứ 4"
                  color={newSchedule.days.wednesday ? "primary" : "default"}
                  onClick={() => handleNewScheduleDayChange('wednesday')}
                  variant={newSchedule.days.wednesday ? "filled" : "outlined"}
                />
                <Chip 
                  label="Thứ 5"
                  color={newSchedule.days.thursday ? "primary" : "default"}
                  onClick={() => handleNewScheduleDayChange('thursday')}
                  variant={newSchedule.days.thursday ? "filled" : "outlined"}
                />
                <Chip 
                  label="Thứ 6"
                  color={newSchedule.days.friday ? "primary" : "default"}
                  onClick={() => handleNewScheduleDayChange('friday')}
                  variant={newSchedule.days.friday ? "filled" : "outlined"}
                />
                <Chip 
                  label="Thứ 7"
                  color={newSchedule.days.saturday ? "primary" : "default"}
                  onClick={() => handleNewScheduleDayChange('saturday')}
                  variant={newSchedule.days.saturday ? "filled" : "outlined"}
                />
                <Chip 
                  label="Chủ nhật"
                  color={newSchedule.days.sunday ? "primary" : "default"}
                  onClick={() => handleNewScheduleDayChange('sunday')}
                  variant={newSchedule.days.sunday ? "filled" : "outlined"}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddSchedule(false)}>Hủy</Button>
            <Button onClick={handleCreateSchedule} variant="contained">Tạo lịch trình</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog chỉnh sửa lịch trình */}
        <Dialog open={openEditSchedule} onClose={() => setOpenEditSchedule(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Chỉnh sửa lịch trình</DialogTitle>
          <DialogContent>
            {editSchedule && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="Thiết bị"
                  name="device"
                  value={editSchedule.device}
                  onChange={handleEditScheduleInputChange}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="PUMP">Máy bơm 1</MenuItem>
                  <MenuItem value="PUMP_2">Máy bơm 2</MenuItem>
                  <MenuItem value="FAN">Quạt</MenuItem>
                  <MenuItem value="LIGHT">Đèn</MenuItem>
                </TextField>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Giờ"
                    type="number"
                    name="hour"
                    value={editSchedule.hour}
                    onChange={handleEditScheduleInputChange}
                    inputProps={{ min: 0, max: 23 }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Phút"
                    type="number"
                    name="minute"
                    value={editSchedule.minute}
                    onChange={handleEditScheduleInputChange}
                    inputProps={{ min: 0, max: 59 }}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <TextField
                  fullWidth
                  select
                  label="Hành động"
                  name="action"
                  value={editSchedule.action}
                  onChange={handleEditScheduleInputChange}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value={true}>BẬT thiết bị</MenuItem>
                  <MenuItem value={false}>TẮT thiết bị</MenuItem>
                </TextField>

                <FormControlLabel
                  control={
                    <Switch
                      checked={editSchedule.active}
                      onChange={(e) => setEditSchedule(prev => ({ ...prev, active: e.target.checked }))}
                    />
                  }
                  label="Kích hoạt lịch trình"
                />

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Các ngày trong tuần:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip 
                    label="Thứ 2"
                    color={editSchedule.days.monday ? "primary" : "default"}
                    onClick={() => handleEditScheduleDayChange('monday')}
                    variant={editSchedule.days.monday ? "filled" : "outlined"}
                  />
                  <Chip 
                    label="Thứ 3"
                    color={editSchedule.days.tuesday ? "primary" : "default"}
                    onClick={() => handleEditScheduleDayChange('tuesday')}
                    variant={editSchedule.days.tuesday ? "filled" : "outlined"}
                  />
                  <Chip 
                    label="Thứ 4"
                    color={editSchedule.days.wednesday ? "primary" : "default"}
                    onClick={() => handleEditScheduleDayChange('wednesday')}
                    variant={editSchedule.days.wednesday ? "filled" : "outlined"}
                  />
                  <Chip 
                    label="Thứ 5"
                    color={editSchedule.days.thursday ? "primary" : "default"}
                    onClick={() => handleEditScheduleDayChange('thursday')}
                    variant={editSchedule.days.thursday ? "filled" : "outlined"}
                  />
                  <Chip 
                    label="Thứ 6"
                    color={editSchedule.days.friday ? "primary" : "default"}
                    onClick={() => handleEditScheduleDayChange('friday')}
                    variant={editSchedule.days.friday ? "filled" : "outlined"}
                  />
                  <Chip 
                    label="Thứ 7"
                    color={editSchedule.days.saturday ? "primary" : "default"}
                    onClick={() => handleEditScheduleDayChange('saturday')}
                    variant={editSchedule.days.saturday ? "filled" : "outlined"}
                  />
                  <Chip 
                    label="Chủ nhật"
                    color={editSchedule.days.sunday ? "primary" : "default"}
                    onClick={() => handleEditScheduleDayChange('sunday')}
                    variant={editSchedule.days.sunday ? "filled" : "outlined"}
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditSchedule(false)}>Hủy</Button>
            <Button onClick={handleUpdateSchedule} variant="contained">Lưu thay đổi</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
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

  if (error) {
    return (
      <MainLayout>
        <Container maxWidth="xl">
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/gardens')}
            sx={{ mt: 2 }}
          >
            Quay lại danh sách vườn
          </Button>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="xl">
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isOffline && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 2,
              '& .MuiAlert-icon': {
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 }
                }
              }
            }}
          >
            Thiết bị đang offline. {lastConnectedDate ? `Lần kết nối cuối: ${lastConnectedDate.toLocaleString('vi-VN')}` : 'Chưa từng kết nối'}
          </Alert>
        )}

        <Box sx={{ 
          opacity: isOffline ? 0.7 : 1,
          transition: 'opacity 0.3s ease-in-out',
          filter: isOffline ? 'grayscale(30%)' : 'none'
        }}>
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
              <Tab label="Lịch trình" icon={<ScheduleIcon />} iconPosition="start" />
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
                      {garden.description || '--'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Ngày tạo:</strong> {createdDate ? createdDate.toLocaleDateString('vi-VN') : '--'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Kết nối cuối:</strong> {lastConnectedDate ? lastConnectedDate.toLocaleString('vi-VN') : '--'}
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
                            Chụp vào: {latestImage.timestamp ? new Date(latestImage.timestamp).toLocaleString('vi-VN') : 'Chưa có thông tin'}
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
                          <strong>Thời gian phân tích:</strong> {analysis.timestamp ? new Date(analysis.timestamp).toLocaleString('vi-VN') : 'Chưa có thông tin'}
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
          
          {/* Tab lịch trình */}
          <div role="tabpanel" hidden={tabValue !== 3}>
            {tabValue === 3 && renderScheduleManager()}
          </div>
          
          {/* Tab camera */}
          <div role="tabpanel" hidden={tabValue !== (garden.has_camera ? 4 : 3)}>
            {tabValue === (garden.has_camera ? 4 : 3) && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={garden.has_camera ? 8 : 12}>
                  <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Thông tin vườn
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body1" paragraph>
                      {garden.description || '--'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Ngày tạo:</strong> {createdDate ? createdDate.toLocaleDateString('vi-VN') : '--'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Kết nối cuối:</strong> {lastConnectedDate ? lastConnectedDate.toLocaleString('vi-VN') : '--'}
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
                            Chụp vào: {latestImage.timestamp ? new Date(latestImage.timestamp).toLocaleString('vi-VN') : 'Chưa có thông tin'}
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
              </Grid>
            )}
          </div>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default GardenDetail; 
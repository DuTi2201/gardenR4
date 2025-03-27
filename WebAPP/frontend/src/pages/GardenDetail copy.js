import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import MainLayout from '../components/Layout/MainLayout';
import ConnectionStatus from '../components/ConnectionStatus';
import { sensorService, deviceService, imageService, analysisService, scheduleService } from '../services';
import {
  Box, Container, Grid, Typography, Paper, Button, Card, CardContent, CardMedia, 
  AppBar, Tabs, Tab, CircularProgress, Divider, List, ListItem, ListItemText, ListItemIcon,
  TextField, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Chip, Switch, FormControlLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, Alert, CardActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  ErrorOutline as ErrorOutlineIcon,
  BugReport as BugReportIcon,
  History as HistoryIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  PhotoCamera as PhotoCameraIcon,
  Refresh as RefreshIcon,
  Videocam as VideocamIcon,
  Stop as StopIcon,
  Dashboard as DashboardIcon,
  Devices as DevicesIcon,
  PlayArrow as PlayArrowIcon,
  ArrowRight as ArrowRightIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  TipsAndUpdates as TipsAndUpdatesIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Spa as SpaIcon,
  Info as InfoIcon,
  PestControl as PestControlIcon,
  ColorLens as ColorLensIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useTheme, alpha } from '@mui/material/styles';
import '../styles/GardenDetail.css';

// Định nghĩa các style chung để đồng bộ với Dashboard
const sharedStyles = {
  card: {
    borderRadius: 3,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
    }
  },
  cardContent: {
    padding: 3,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  dataBox: {
    padding: 2.5,
    borderRadius: 2,
    lineHeight: 1.6,
  },
  gradientText: {
    background: 'linear-gradient(45deg, #2196F3, #4CAF50)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  gradientButton: {
    borderRadius: '28px',
    padding: '10px 24px',
    background: 'linear-gradient(45deg, #4CAF50, #2196F3)',
    boxShadow: '0 4px 14px rgba(76, 175, 80, 0.25)',
    border: 'none',
    fontWeight: 600,
    textTransform: 'none',
    '&:hover': {
      background: 'linear-gradient(45deg, #45a049, #1976d2)',
      boxShadow: '0 6px 18px rgba(76, 175, 80, 0.35)',
    },
    '&:disabled': {
      opacity: 0.7,
      color: 'white'
    }
  },
  tabsContainer: {
    '& .MuiTab-root': {
      fontWeight: 'medium',
      fontSize: '0.95rem',
      textTransform: 'none',
      minHeight: '48px'
    },
    '& .Mui-selected': {
      fontWeight: 'bold',
      color: 'primary.main'
    },
    '& .MuiTabs-indicator': {
      backgroundColor: 'primary.main',
      height: 3,
      borderRadius: '3px 3px 0 0'
    }
  }
};

const GardenDetail = () => {
  const { gardenId } = useParams();
  const navigate = useNavigate();
  const { getGardenById } = useGarden();
  const { joinGardenRoom, subscribe, unsubscribe } = useSocket();
  const { toast } = useToast();
  const { socket } = useSocket(); // Thêm dòng này để lấy socket từ context
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [garden, setGarden] = useState({
    _id: '',
    name: 'Đang tải...',
    description: 'Đang tải...',
    device_serial: '',
    camera_serial: '',
    last_connected: null,
    is_connected: false,
    camera_is_connected: false,
    camera_last_connected: null,
    has_camera: false,
    sensor_data: null,
    devices: []
  });
  const [sensorData, setSensorData] = useState(null);
  const [deviceStates, setDeviceStates] = useState({
    fan: false,
    light: false,
    pump: false,
    pump2: false,
    auto: false,
  });
  const [deviceLoading, setDeviceLoading] = useState({
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
  const [isOffline, setIsOffline] = useState(true); // Default to true until proven otherwise
  const [isCameraOffline, setIsCameraOffline] = useState(true); // Trạng thái kết nối camera
  const [lastConnected, setLastConnected] = useState(null);
  const [lastCameraConnected, setLastCameraConnected] = useState(null); // Thời gian kết nối cuối camera
  const [createdDate, setCreatedDate] = useState(null);
  const [lastConnectedDate, setLastConnectedDate] = useState(null);
  const [analysisImage, setAnalysisImage] = useState(null);
  const [applyingSuggestions, setApplyingSuggestions] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamImage, setStreamImage] = useState(null);
  const streamRef = useRef(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [analysisTabValue, setAnalysisTabValue] = useState(0);
  // Thêm state mới để lưu phân tích được chọn từ lịch sử
  const [selectedHistoryAnalysis, setSelectedHistoryAnalysis] = useState(null);
  const [viewHistoryDialogOpen, setViewHistoryDialogOpen] = useState(false);

  // Hàm tải dữ liệu lịch trình
  const loadSchedules = async () => {
    try {
      console.log('Đang tải lịch trình cho vườn:', gardenId);
      setSchedulesLoading(true);
      const schedulesResponse = await scheduleService.getSchedules(gardenId);
      console.log('Dữ liệu lịch trình từ API:', schedulesResponse);
      
      if (schedulesResponse && schedulesResponse.data) {
        setSchedules(schedulesResponse.data);
      } else if (Array.isArray(schedulesResponse)) {
        setSchedules(schedulesResponse);
      } else {
        console.warn('Không nhận được định dạng dữ liệu lịch trình như mong đợi:', schedulesResponse);
        setSchedules([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải lịch trình:', error);
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  };

  useEffect(() => {
    if (gardenId) {
      loadGardenData();
      loadAnalysisData(); // Tải dữ liệu phân tích khi trang mở
      loadSchedules(); // Tải dữ liệu lịch trình khi trang mở
      joinGardenRoom(gardenId);

      // Đăng ký lắng nghe sự kiện cập nhật dữ liệu cảm biến
      subscribe('sensor_data_update', handleSensorDataUpdate);

      // Đăng ký lắng nghe sự kiện cập nhật trạng thái thiết bị
      subscribe('device_status_update', handleDeviceStatusUpdate);

      // Đăng ký lắng nghe sự kiện kết nối/ngắt kết nối
      subscribe('device_connection_status', handleConnectionStatus);
      
      // Đăng ký lắng nghe sự kiện kết nối/ngắt kết nối camera
      subscribe('camera_connection_status', handleCameraConnectionStatus);
      
      // Đăng ký lắng nghe sự kiện nhận hình ảnh stream
      if (socket) {
        socket.on('stream_frame', handleStreamData);
      }
      
      // Tự động làm mới dữ liệu mỗi 30 giây
      const interval = setInterval(() => {
        loadGardenData();
      }, 30000);

      return () => {
        unsubscribe('sensor_data_update', handleSensorDataUpdate);
        unsubscribe('device_status_update', handleDeviceStatusUpdate);
        unsubscribe('device_connection_status', handleConnectionStatus);
        unsubscribe('camera_connection_status', handleCameraConnectionStatus);
        if (socket) {
          socket.off('stream_frame', handleStreamData);
        }
        clearInterval(interval);
      };
    }
  }, [gardenId, socket]);

  const handleConnectionStatus = (data) => {
    console.log('Nhận thông tin trạng thái kết nối từ socket:', data);
    
    // Cập nhật trạng thái offline/online
    const isConnected = data.connected === true;
    console.log('Cập nhật trạng thái kết nối:', isConnected ? 'Online' : 'Offline');
    setIsOffline(!isConnected);
    
    // Cập nhật thời gian kết nối cuối
    if (data.timestamp) {
      const timestamp = new Date(data.timestamp);
      console.log('Thời gian kết nối/ngắt kết nối:', timestamp);
      
      // Nếu thiết bị online, cập nhật lastConnected
      if (isConnected) {
        setLastConnected(timestamp);
      }
      
      // Cập nhật lastConnectedDate bất kể online hay offline
      setLastConnectedDate(timestamp);
    } else {
      console.warn('Thiếu thông tin timestamp trong event device_connection_status');
    }
    
    // Cập nhật trạng thái trong state garden
    setGarden(prevGarden => ({
      ...prevGarden,
      is_connected: isConnected,
      last_connected: isConnected ? new Date() : prevGarden.last_connected,
      last_disconnected: isConnected ? null : new Date()
    }));
    
    // Chỉ hiển thị thông báo khi có message từ server
    if (toast && data.message) {
      if (isConnected) {
        toast.success(data.message);
      } else {
        toast.warning(data.message || 'Thiết bị đã ngắt kết nối!');
      }
    }
  };

  const handleCameraConnectionStatus = (data) => {
    console.log('Nhận thông tin trạng thái kết nối camera từ socket:', data);
    
    // Cập nhật trạng thái offline/online
    const isConnected = data.connected === true;
    console.log('Cập nhật trạng thái kết nối camera:', isConnected ? 'Online' : 'Offline');
    setIsCameraOffline(!isConnected);
    
    // Cập nhật thời gian kết nối cuối
    if (data.timestamp) {
      const timestamp = new Date(data.timestamp);
      console.log('Thời gian kết nối/ngắt kết nối camera:', timestamp);
      
      // Nếu camera online, cập nhật lastCameraConnected
      if (isConnected) {
        setLastCameraConnected(timestamp);
      }
    } else {
      console.warn('Thiếu thông tin timestamp trong event camera_connection_status');
    }
    
    // Cập nhật trạng thái trong state garden
    setGarden(prevGarden => ({
      ...prevGarden,
      camera_is_connected: isConnected,
      camera_last_connected: isConnected ? new Date() : prevGarden.camera_last_connected,
      camera_last_disconnected: isConnected ? null : new Date()
    }));
    
    // Chỉ hiển thị thông báo khi có message từ server
    if (toast && data.message) {
      if (isConnected) {
        toast.success(data.message);
      } else {
        toast.warning(data.message || 'Camera đã ngắt kết nối!');
      }
    }
  };

  const loadGardenData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading garden data for ID:', gardenId);

      // Lấy thông tin vườn
      const gardenData = await getGardenById(gardenId);
      console.log('Garden data từ API:', gardenData);
      
      // Debug thông tin API
      console.log('Thông tin kết nối:', {
        is_connected: gardenData?.garden?.is_connected,
        last_connected: gardenData?.garden?.last_connected,
        camera_is_connected: gardenData?.garden?.camera_is_connected,
        camera_last_connected: gardenData?.garden?.camera_last_connected,
        description: gardenData?.garden?.description,
        created_at: gardenData?.garden?.created_at,
        name: gardenData?.garden?.name
      });

      // Kiểm tra và set garden data an toàn
      if (gardenData && gardenData.garden) {
        const garden = gardenData.garden;
        
        // Cập nhật state garden
        setGarden(garden);
        
        // Cập nhật sensor data
        if (garden.sensor_data) {
          setSensorData(garden.sensor_data);
        }
        
        // Cập nhật trạng thái kết nối
        setIsOffline(!garden.is_connected);
        if (garden.has_camera) {
          setIsCameraOffline(!garden.camera_is_connected);
        }
        
        // Cập nhật thời gian kết nối cuối
        if (garden.last_connected) {
          setLastConnected(new Date(garden.last_connected));
          setLastConnectedDate(new Date(garden.last_connected));
        }
        
        // Cập nhật thời gian kết nối cuối của camera
        if (garden.camera_last_connected) {
          setLastCameraConnected(new Date(garden.camera_last_connected));
        }
        
        // Cập nhật thời gian tạo
        if (garden.created_at) {
          setCreatedDate(new Date(garden.created_at));
        }
        
        // Set device states
        if (garden.devices && garden.devices.length > 0) {
          const newDeviceStates = {
            fan: false,
            light: false,
            pump: false,
            pump2: false,
            auto: false
          };
          
          // Lấy trạng thái từ các thiết bị trong vườn
          garden.devices.forEach(device => {
            // Thiết bị tự động theo dạng AUTO
            if (device.device_id.toUpperCase() === 'AUTO') {
              newDeviceStates.auto = device.status || false;
            }
            // Các thiết bị khác theo loại
            else if (device.device_id.toUpperCase() === 'FAN') {
              newDeviceStates.fan = device.status || false;
            }
            else if (device.device_id.toUpperCase() === 'LIGHT') {
              newDeviceStates.light = device.status || false;
            }
            else if (device.device_id.toUpperCase() === 'PUMP') {
              newDeviceStates.pump = device.status || false;
            }
            else if (device.device_id.toUpperCase() === 'PUMP2' || device.device_id.toUpperCase() === 'PUMP_2') {
              newDeviceStates.pump2 = device.status || false;
            }
          });
          
          setDeviceStates(newDeviceStates);
        }
      }
    } catch (error) {
      console.error('Error loading garden data:', error);
      setError('Không thể tải dữ liệu vườn. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSensorDataUpdate = (data) => {
    setSensorData(data);
  };

  const handleDeviceStatusUpdate = (data) => {
    console.log("Nhận cập nhật trạng thái thiết bị từ socket:", data);
    
    // Ở đây cần cập nhật trạng thái thiết bị theo đúng cấu trúc dữ liệu mà giao diện sử dụng
    // data.device có thể là "FAN", "LIGHT", "PUMP", "PUMP2" hoặc "AUTO"
    // Chuyển đổi thành chữ thường để so sánh
    const deviceKey = data.device.toLowerCase();
    
    // Cập nhật trạng thái thiết bị
    setDeviceStates(prevState => ({
      ...prevState,
      [deviceKey]: data.state
    }));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCaptureImage = async () => {
    try {
      setCaptureLoading(true);
      await deviceService.captureImage(garden.camera_serial);
      toast.success('Yêu cầu chụp ảnh đã được gửi đến camera');
      
      // Đợi 5 giây cho camera xử lý và gửi ảnh lên server
      setTimeout(async () => {
        // Tải danh sách ảnh mới nhất
        const images = await imageService.getGardenImages(gardenId);
        if (images && images.length > 0) {
          setLatestImage(images[0]);
        }
        setCaptureLoading(false);
      }, 5000);
    } catch (error) {
      console.error('Error capturing image:', error);
      toast.error('Không thể yêu cầu chụp ảnh: ' + error.message);
      setCaptureLoading(false);
    }
  };

  const handleAnalyzeGarden = async () => {
    setAnalysisLoading(true);
    
    try {
      console.log('Đang gửi yêu cầu phân tích cho vườn:', gardenId);
      const response = await analysisService.analyzeGarden(gardenId);
      console.log('Phản hồi từ API phân tích:', response);
      
      if (response.success) {
        if (response.analysis) {
          setAnalysis(response.analysis);
          
          // Cập nhật state để hiển thị ảnh từ phân tích
          if (response.analysis.image && response.analysis.image.url) {
            setAnalysisImage(response.analysis.image);
          }
          
          toast.success('Phân tích vườn thành công!');
        } else if (response.data) {
          setAnalysis({
            result: response.data,
            timestamp: new Date()
          });
          toast.success('Phân tích vườn thành công!');
        } else {
          toast.warning('Không nhận được dữ liệu phân tích');
        }
      } else {
        toast.error(response.message || 'Phân tích vườn thất bại');
      }
    } catch (error) {
      console.error('Lỗi khi phân tích vườn:', error);
      toast.error('Có lỗi xảy ra khi phân tích vườn');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Hàm tải dữ liệu phân tích gần nhất
  const loadAnalysisData = async () => {
    try {
      const response = await analysisService.getLatestAnalysis(gardenId);
      console.log('Dữ liệu phân tích vườn:', response);
      if (response.success && response.analysis) {
        setAnalysis(response.analysis);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu phân tích:', err);
    }
  };

  const handleDeviceControl = async (device, state) => {
    // Khai báo deviceKey bên ngoài khối try để có thể sử dụng trong catch
    // Sử dụng device.device_id nếu là object, ngược lại sử dụng trực tiếp device
    const deviceId = device.device_id || device;
    const deviceKey = deviceId.toLowerCase();
    
    try {
      // Đặt trạng thái loading cho thiết bị
      setDeviceLoading(prevState => ({
        ...prevState,
        [deviceKey]: true
      }));
      
      // Gọi API điều khiển thiết bị
      await deviceService.controlDevice(gardenId, deviceId, state);
      
      // Cập nhật trạng thái thiết bị sau khi gửi lệnh thành công
      setDeviceStates(prevState => ({
        ...prevState,
        [deviceKey]: state,
      }));
      
      // Giữ trạng thái loading trong 20 giây
      setTimeout(() => {
        setDeviceLoading(prevState => ({
          ...prevState,
          [deviceKey]: false
        }));
      }, 20000); // 20 giây
    } catch (err) {
      console.error(`Lỗi khi điều khiển thiết bị ${device}:`, err);
      
      // Trường hợp lỗi vẫn phải tắt loading sau 20 giây
      setTimeout(() => {
        setDeviceLoading(prevState => ({
          ...prevState,
          [deviceKey]: false
        }));
      }, 20000);
    }
  };

  const handleAutoModeToggle = async () => {
    try {
      const newState = !deviceStates.auto;
      
      // Đặt trạng thái loading cho chế độ tự động
      setDeviceLoading(prevState => ({
        ...prevState,
        auto: true
      }));
      
      // Sử dụng API thresholds để bật/tắt chế độ tự động
      await deviceService.setAutoMode(gardenId, newState);
      
      // Cập nhật trạng thái chế độ tự động
      setDeviceStates(prevState => ({
        ...prevState,
        auto: newState,
      }));
      
      // Giữ trạng thái loading trong 20 giây
      setTimeout(() => {
        setDeviceLoading(prevState => ({
          ...prevState,
          auto: false
        }));
      }, 20000); // 20 giây
    } catch (err) {
      console.error('Lỗi khi bật/tắt chế độ tự động:', err);
      
      // Trường hợp lỗi vẫn phải tắt loading sau 20 giây
      setTimeout(() => {
        setDeviceLoading(prevState => ({
          ...prevState,
          auto: false
        }));
      }, 20000);
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

  // Hàm chuyển đổi tên ngày sang tiếng Việt
  const getDayNameVi = (dayName) => {
    const dayMap = {
      'monday': 'Thứ 2',
      'tuesday': 'Thứ 3',
      'wednesday': 'Thứ 4',
      'thursday': 'Thứ 5',
      'friday': 'Thứ 6',
      'saturday': 'Thứ 7',
      'sunday': 'CN'
    };
    return dayMap[dayName.toLowerCase()] || dayName;
  };

  const handleApplySuggestions = async () => {
    setApplyingSuggestions(true);
    try {
      // Log thông tin đề xuất trước khi gửi
      console.log('device_recommendations trước khi gửi:', analysis.result.device_recommendations);
      
      // Đảm bảo rằng mỗi đề xuất có định dạng đúng và sửa lỗi tên thiết bị
      const formattedSuggestions = analysis.result.device_recommendations.map(suggestion => {
        // Sửa lỗi PUMP2 thành PUMP_2 để phù hợp với enum trong mô hình dữ liệu
        let deviceName = suggestion.device;
        if (deviceName === 'PUMP2') {
          deviceName = 'PUMP_2';
        }
        
        return {
          device: deviceName,
          action: suggestion.action,
          time: suggestion.time,
          days: suggestion.days
        };
      });
      
      console.log('Suggestions đã được định dạng:', formattedSuggestions);
      
      await analysisService.applySuggestions(gardenId, formattedSuggestions);
      toast.success('Đề xuất đã được áp dụng thành công!');
      
      // Tải lại dữ liệu vườn
      loadGardenData();
      
      // Tải lại danh sách lịch trình
      await loadSchedules();
    } catch (error) {
      console.error('Lỗi khi áp dụng đề xuất:', error);
      toast.error('Có lỗi xảy ra khi áp dụng đề xuất: ' + (error.response?.data?.message || error.message));
    } finally {
      setApplyingSuggestions(false);
    }
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

  const getTabIndex = (tabName) => {
    switch(tabName) {
      case 'overview': return 0;
      // case 'sensors': return 1; // Đã bỏ tab cảm biến
      case 'control': return 1; // Điều chỉnh chỉ số sau khi bỏ tab cảm biến
      case 'schedule': return 2; // Điều chỉnh chỉ số
      case 'camera': return garden?.has_camera ? 3 : -1; // Điều chỉnh chỉ số
      case 'analysis': return garden?.has_camera ? 4 : 3; // Điều chỉnh chỉ số
      // case 'settings': return garden?.has_camera ? 6 : 5; // Đã bỏ tab cài đặt
      default: return -1;
    }
  };
  
  console.log('Garden has camera:', garden?.has_camera, 'camera tab index:', getTabIndex('camera'));

  // Thêm hàm xử lý stream
  const handleStreamData = (data) => {
    console.log('Nhận frame stream từ camera:', data);
    
    if (!data || !data.data) {
      console.error('Stream data không hợp lệ:', data);
      return;
    }
    
    try {
      // Chuyển đổi arrayBuffer thành base64
      const blob = new Blob([data.data], { type: 'image/jpeg' });
      const reader = new FileReader();
      reader.onload = function() {
        console.log('Stream frame đã được xử lý thành công');
        setStreamImage(reader.result);
      };
      reader.onerror = function(error) {
        console.error('Lỗi khi đọc stream frame:', error);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Lỗi khi xử lý dữ liệu stream:', error);
    }
  };

  // Thêm hàm điều khiển stream
  const toggleStream = async () => {
    try {
      console.log('Điều khiển stream cho camera serial:', garden.camera_serial);
      
      if (!garden.camera_serial) {
        toast.error('Không tìm thấy mã thiết bị camera. Vui lòng kiểm tra cài đặt vườn.');
        return;
      }
      
      if (isStreaming) {
        // Dừng stream
        console.log('Gửi lệnh dừng stream tới camera:', garden.camera_serial);
        await deviceService.controlStream(garden.camera_serial, false);
        setIsStreaming(false);
        toast.info('Đã dừng stream video');
      } else {
        // Bắt đầu stream
        console.log('Gửi lệnh bắt đầu stream tới camera:', garden.camera_serial);
        await deviceService.controlStream(garden.camera_serial, true);
        setIsStreaming(true);
        toast.success('Đã bắt đầu stream video');
      }
    } catch (error) {
      console.error('Error toggling stream:', error);
      toast.error('Không thể điều khiển stream: ' + error.message);
    }
  };

  // Thêm useEffect để lắng nghe sự kiện stream
  useEffect(() => {
    if (socket) {
      socket.on('stream_frame', handleStreamData);
      
      // Debug thông tin token
      console.log('Current token:', localStorage.getItem('token'));
      console.log('Socket đã được đăng ký để lắng nghe stream_frame cho garden:', garden?._id);
      
      return () => {
        socket.off('stream_frame', handleStreamData);
      };
    }
  }, [socket, garden]);

  // Render Camera Section
  const renderCameraSection = () => {
    return (
      <Paper elevation={3} sx={{ mb: 4, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Typography variant="h6" component="h2" display="flex" alignItems="center">
                <PhotoCameraIcon sx={{ mr: 1 }} /> Camera
              </Typography>
            </Grid>
            <Grid item>
              {garden.has_camera && (
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Mã Camera: <strong>{garden.camera_serial || 'N/A'}</strong>
                  </Typography>
                  <Chip 
                    label={isCameraOffline ? "Offline" : "Online"} 
                    color={isCameraOffline ? "error" : "success"} 
                    size="small"
                    sx={{ mr: 1 }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
        
        {!garden.has_camera ? (
          <Box p={3}>
            <Alert severity="info">
              Vườn này không có camera. Bạn có thể cài đặt module ESP32-CAM và kích hoạt tính năng camera trong cài đặt vườn.
            </Alert>
          </Box>
        ) : (
          <Box p={3}>
            {isCameraOffline ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Camera hiện đang offline. Vui lòng kiểm tra kết nối camera.
                {lastCameraConnected && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Kết nối cuối: {lastCameraConnected.toLocaleString('vi-VN')}
                  </Typography>
                )}
              </Alert>
            ) : (
              <Box mb={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PhotoCameraIcon />}
                      onClick={handleCaptureImage}
                      disabled={captureLoading || isCameraOffline}
                      fullWidth
                    >
                      {captureLoading ? 'Đang chụp...' : 'Chụp ảnh'}
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      color={isStreaming ? "error" : "success"}
                      startIcon={isStreaming ? <StopIcon /> : <VideocamIcon />}
                      onClick={toggleStream}
                      disabled={isCameraOffline}
                      fullWidth
                    >
                      {isStreaming ? 'Dừng stream' : 'Bắt đầu stream'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            {/* Stream Video - Luôn hiển thị khi isStreaming=true, kể cả khi chưa có ảnh đầu tiên */}
            {isStreaming && (
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Stream Video
                </Typography>
                <Card>
                  {streamImage ? (
                    <img 
                      src={streamImage} 
                      alt="Live stream" 
                      width="100%" 
                      ref={streamRef}
                      style={{ display: 'block', maxWidth: '100%' }}
                    />
                  ) : (
                    <Box sx={{ 
                      height: 300, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: '#f0f0f0' 
                    }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography variant="body2">
                          Đang kết nối với stream video...
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Card>
              </Box>
            )}
            
            {/* Latest Image */}
            {latestImage && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Hình ảnh mới nhất
                </Typography>
                <Card>
                  <CardMedia
                    component="img"
                    image={latestImage.image_url}
                    alt="Garden image"
                    sx={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Chụp lúc: {new Date(latestImage.created_at).toLocaleString('vi-VN')}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      color="primary"
                      onClick={() => window.open(latestImage.image_url, '_blank')}
                    >
                      Xem đầy đủ
                    </Button>
                    <Button 
                      size="small" 
                      color="primary"
                      onClick={() => handleAnalyzeImage(latestImage._id)}
                      disabled={analysisLoading}
                    >
                      Phân tích
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    );
  };

  // Thêm hàm này vào cùng khu vực với các hàm xử lý khác, trước hàm loadAnalysisData
  const handleAnalyzeImage = async (imageId) => {
    try {
      setAnalysisLoading(true);
      const result = await imageService.analyzeImage(imageId);
      setAnalysis(result.analysis);
      toast.success('Đã phân tích hình ảnh thành công');
      // Chuyển sang tab phân tích
      setTabValue(garden?.has_camera ? 4 : 3);
    } catch (error) {
      console.error('Lỗi khi phân tích hình ảnh:', error);
      toast.error('Không thể phân tích hình ảnh: ' + error.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const loadAnalysisHistory = useCallback(async () => {
    if (!garden?._id) return;
    
    try {
      setLoadingHistory(true);
      const response = await analysisService.getAnalysisHistory(garden._id);
      
      if (response.success) {
        setAnalysisHistory(response.data);
      } else {
        console.error('Lỗi khi lấy lịch sử phân tích:', response.message);
        // Không cần toast vì đây có thể là trường hợp bình thường khi chưa có lịch sử
      }
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử phân tích:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [garden?._id]);

  // Thêm gọi API trong useEffect
  useEffect(() => {
    if (garden?._id) {
      loadAnalysisHistory();
    }
  }, [garden?._id, loadAnalysisHistory]);

  // Thêm hàm xử lý xóa phân tích
  const handleDeleteAnalysis = async (analysisId) => {
    try {
      if (!window.confirm('Bạn có chắc chắn muốn xóa phân tích này?')) {
        return;
      }
      
      const response = await analysisService.deleteAnalysis(garden._id, analysisId);
      
      if (response.success) {
        toast.success('Đã xóa phân tích thành công');
        // Cập nhật lại danh sách lịch sử
        loadAnalysisHistory();
      } else {
        toast.error(response.message || 'Không thể xóa phân tích');
      }
    } catch (error) {
      console.error('Lỗi khi xóa phân tích:', error);
      toast.error('Đã xảy ra lỗi khi xóa phân tích');
    }
  };

  // Thêm hàm xử lý thay đổi tab phân tích
  const handleAnalysisTabChange = (event, newValue) => {
    setAnalysisTabValue(newValue);
  };

  // Thêm hàm xử lý xem lại phân tích cụ thể từ lịch sử
  const handleViewHistoryAnalysis = (analysisItem) => {
    setSelectedHistoryAnalysis(analysisItem);
    setViewHistoryDialogOpen(true);
  };

  // Thêm hàm đóng dialog xem lịch sử phân tích
  const handleCloseHistoryDialog = () => {
    setViewHistoryDialogOpen(false);
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

  console.log('Rendering với state:', {
    garden: garden,
    isOffline: isOffline,
    createdDate: createdDate,
    lastConnectedDate: lastConnectedDate,
    sensorData: sensorData,
    deviceStates: deviceStates,
    tabValue: tabValue
  });

  return (
    <MainLayout>
      <Container maxWidth="xl" className="garden-detail">
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
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ConnectionStatus 
                isConnected={false} 
                lastConnected={lastConnectedDate} 
                size="small"
                variant="dot"
                showText={false}
              />
              <Box sx={{ ml: 1 }}>
                <strong>Thiết bị đang offline.</strong> {lastConnectedDate ? ` Lần kết nối cuối: ${lastConnectedDate.toLocaleString('vi-VN')}` : ' Chưa có thông tin kết nối.'}
              </Box>
            </Box>
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
              {/* <Tab label="Cảm biến" /> */}
              <Tab label="Điều khiển" />
              <Tab label="Lịch trình" icon={<ScheduleIcon />} iconPosition="start" />
              {garden.has_camera && <Tab label="Camera" />}
              <Tab label="Phân tích" />
              {/* <Tab label="Cài đặt" /> */}
            </Tabs>
          </Box>

          {/* Nội dung tab */}
          <div role="tabpanel" hidden={tabValue !== 0}>
            {tabValue === 0 && (
              <Grid container spacing={3}>
                {/* Debug section*/}
                {/* <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#f9f9f9' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Debug Info (Xóa trong bản production)
                    </Typography>
                    <Box component="pre" sx={{ overflow: 'auto', maxHeight: 200, fontSize: '0.8rem' }}>
                      {JSON.stringify({
                        garden_id: garden?._id,
                        name: garden?.name,
                        description: garden?.description,
                        isOffline: isOffline,
                        created_at: garden?.created_at,
                        createdDate: createdDate ? createdDate.toString() : null,
                        last_connected: garden?.last_connected,
                        lastConnectedDate: lastConnectedDate ? lastConnectedDate.toString() : null,
                        deviceStates: deviceStates,
                      }, null, 2)}
                    </Box>
                  </Paper>
                </Grid> */}
                <Grid item xs={12} md={garden.has_camera ? 8 : 12}>
                  <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        Thông tin vườn: {garden.name}
                      </Typography>
                      <ConnectionStatus 
                        isConnected={!isOffline} 
                        lastConnected={lastConnectedDate} 
                        size="medium"
                        variant="badge"
                        showText={true}
                      />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body1" paragraph>
                      <strong>Mô tả:</strong> {garden.description !== 'Không có mô tả' ? garden.description : 'Không có mô tả'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Mã serial:</strong> {garden.device_serial || '--'}
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
                          <Typography variant="h4" color="primary" className="sensor-value">
                            {sensorData?.temperature || '--'}°C
                          </Typography>
                          <Typography variant="body1">
                            Độ ẩm: <span className="sensor-value">{sensorData?.humidity || '--'}%</span>
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
                          <Typography variant="h4" color="primary" className="sensor-value">
                            {sensorData?.light || '--'}%
                          </Typography>
                          <Typography variant="body1">
                            Độ ẩm đất: <span className="sensor-value">{sensorData?.soil || '--'}%</span>
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
                
                {garden.has_camera && (
                  <Grid item xs={12} md={4}>
                    {renderCameraSection()}
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
                        variant="contained"
                        startIcon={<BarChartIcon />}
                        onClick={handleAnalyzeGarden}
                        disabled={analysisLoading}
                        className="gradient-button"
                      >
                        {analysisLoading ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                            Đang phân tích...
                          </Box>
                        ) : (
                          'Phân tích mới'
                        )}
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
          <div role="tabpanel" hidden={tabValue !== 1}>
            {tabValue === 1 && (
              <Box>
                <Typography variant="h5" gutterBottom>
                  Điều khiển thiết bị
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ mb: 3, position: 'relative' }}>
                  {deviceLoading.auto && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        zIndex: 1,
                        borderRadius: '4px'
                      }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={deviceStates.auto}
                        onChange={handleAutoModeToggle}
                        color="primary"
                        disabled={deviceLoading.auto}
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
                    <Card sx={{ position: 'relative' }}>
                      {deviceLoading.fan && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            zIndex: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      )}
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
                          disabled={deviceStates.auto || deviceStates.fan || deviceLoading.fan}
                          onClick={() => handleDeviceControl({device_id: 'FAN', category: 'FAN'}, true)}
                          fullWidth
                        >
                          BẬT
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          disabled={deviceStates.auto || !deviceStates.fan || deviceLoading.fan}
                          onClick={() => handleDeviceControl({device_id: 'FAN', category: 'FAN'}, false)}
                          fullWidth
                        >
                          TẮT
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ position: 'relative' }}>
                      {deviceLoading.light && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            zIndex: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      )}
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
                          disabled={deviceStates.auto || deviceStates.light || deviceLoading.light}
                          onClick={() => handleDeviceControl({device_id: 'LIGHT', category: 'LIGHT'}, true)}
                          fullWidth
                        >
                          BẬT
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          disabled={deviceStates.auto || !deviceStates.light || deviceLoading.light}
                          onClick={() => handleDeviceControl({device_id: 'LIGHT', category: 'LIGHT'}, false)}
                          fullWidth
                        >
                          TẮT
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ position: 'relative' }}>
                      {deviceLoading.pump && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            zIndex: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      )}
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
                          disabled={deviceStates.auto || deviceStates.pump || deviceLoading.pump}
                          onClick={() => handleDeviceControl({device_id: 'PUMP', category: 'PUMP'}, true)}
                          fullWidth
                        >
                          BẬT
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          disabled={deviceStates.auto || !deviceStates.pump || deviceLoading.pump}
                          onClick={() => handleDeviceControl({device_id: 'PUMP', category: 'PUMP'}, false)}
                          fullWidth
                        >
                          TẮT
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ position: 'relative' }}>
                      {deviceLoading.pump2 && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            zIndex: 1,
                            borderRadius: '4px'
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      )}
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
                          disabled={deviceStates.auto || deviceStates.pump2 || deviceLoading.pump2}
                          onClick={() => handleDeviceControl({device_id: 'PUMP_2', category: 'PUMP_2'}, true)}
                          fullWidth
                        >
                          BẬT
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          disabled={deviceStates.auto || !deviceStates.pump2 || deviceLoading.pump2}
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
          <div role="tabpanel" hidden={tabValue !== 2}>
            {tabValue === 2 && renderScheduleManager()}
          </div>
          
          {/* Tab camera */}
          <div role="tabpanel" hidden={tabValue !== getTabIndex('camera')}>
            {tabValue === getTabIndex('camera') && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        Thông tin vườn: {garden.name}
                      </Typography>
                      <ConnectionStatus 
                        isConnected={!isOffline} 
                        lastConnected={lastConnectedDate} 
                        size="medium"
                        variant="badge"
                        showText={true}
                      />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body1" paragraph>
                      <strong>Mô tả:</strong> {garden.description !== 'Không có mô tả' ? garden.description : 'Không có mô tả'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Mã serial:</strong> {garden.device_serial || '--'}
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
                          <Typography variant="h4" color="primary" className="sensor-value">
                            {sensorData?.temperature || '--'}°C
                          </Typography>
                          <Typography variant="body1">
                            Độ ẩm: <span className="sensor-value">{sensorData?.humidity || '--'}%</span>
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
                          <Typography variant="h4" color="primary" className="sensor-value">
                            {sensorData?.light || '--'}%
                          </Typography>
                          <Typography variant="body1">
                            Độ ẩm đất: <span className="sensor-value">{sensorData?.soil || '--'}%</span>
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
                
                {garden.has_camera && (
                  <Grid item xs={12} md={4}>
                    {renderCameraSection()}
                  </Grid>
                )}
              </Grid>
            )}
          </div>
          
          {/* Tab phân tích */}
          <div role="tabpanel" hidden={tabValue !== getTabIndex('analysis')}>
            {tabValue === getTabIndex('analysis') && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper 
                    elevation={0} 
                    className="analysis-section"
                    sx={{ p: 3 }}
                  >
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        right: 0, 
                        width: '200px', 
                        height: '200px', 
                        background: 'radial-gradient(circle, rgba(76,175,80,0.1) 0%, rgba(255,255,255,0) 70%)',
                        borderRadius: '0 0 0 100%',
                        zIndex: 0
                      }} 
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BarChartIcon 
                          sx={{ 
                            fontSize: 28, 
                            mr: 1.5,
                            color: (theme) => `${theme.palette.primary.main}`,
                          }} 
                        />
                        <Typography 
                          variant="h5" 
                          fontWeight="600" 
                          className="gradient-text"
                          sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}
                        >
                          Phân tích vườn thông minh
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<BarChartIcon />}
                        onClick={handleAnalyzeGarden}
                        disabled={analysisLoading}
                        className="gradient-button"
                      >
                        {analysisLoading ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                            Đang phân tích...
                          </Box>
                        ) : (
                          'Phân tích mới'
                        )}
                      </Button>
                    </Box>
                    
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                      <Tabs 
                        value={analysisTabValue} 
                        onChange={handleAnalysisTabChange}
                        aria-label="analysis tabs"
                        variant="fullWidth"
                        className="tab-style"
                      >
                        <Tab label="Phân tích hiện tại" />
                        <Tab label="Lịch sử phân tích" />
                      </Tabs>
                    </Box>
                    
                    {/* Tab phân tích hiện tại */}
                    <div role="tabpanel" hidden={analysisTabValue !== 0}>
                      {analysisTabValue === 0 && (
                        <>
                          {analysisLoading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 5 }}>
                              <CircularProgress size={60} sx={{ mb: 2 }} />
                              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>Đang phân tích vườn của bạn</Typography>
                              <Typography variant="body2" color="text.secondary">Điều này có thể mất vài giây...</Typography>
                            </Box>
                          ) : analysis ? (
                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                              <Box sx={{ 
                                mb: 3, 
                                p: 2.5, 
                                borderRadius: 3, 
                                bgcolor: (theme) => theme.palette.mode === 'dark' 
                                  ? 'rgba(33, 150, 243, 0.1)' 
                                  : 'rgba(33, 150, 243, 0.05)',
                                border: (theme) => theme.palette.mode === 'dark'
                                  ? '1px solid rgba(33, 150, 243, 0.2)'
                                  : '1px solid rgba(33, 150, 243, 0.1)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                              }}>
                                <Typography variant="subtitle1" gutterBottom fontWeight="500">
                                  Phân tích được thực hiện vào:
                                </Typography>
                                <Typography variant="h6" color="primary.main" fontWeight="600">
                                  {analysis.timestamp ? new Date(analysis.timestamp).toLocaleString('vi-VN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'Chưa có thông tin'}
                                </Typography>
                              </Box>
                              
                              <Grid container spacing={3}>
                                <Grid item xs={12}>
                                  <Card 
                                    sx={{ 
                                      mb: 3,
                                      borderRadius: 3,
                                      boxShadow: (theme) => theme.palette.mode === 'dark'
                                        ? '0 8px 16px rgba(0,0,0,0.2)'
                                        : '0 8px 16px rgba(0,0,0,0.05)',
                                      overflow: 'hidden',
                                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                      '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: (theme) => theme.palette.mode === 'dark'
                                          ? '0 12px 20px rgba(0,0,0,0.3)'
                                          : '0 12px 20px rgba(0,0,0,0.08)',
                                      }
                                    }}
                                  >
                                    <CardContent sx={{ p: 3 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box sx={{ 
                                          width: 48, 
                                          height: 48, 
                                          borderRadius: '50%', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center',
                                          background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                                          color: 'white',
                                          mr: 2,
                                          boxShadow: '0 4px 8px rgba(76, 175, 80, 0.25)'
                                        }}>
                                          <BarChartIcon sx={{ fontSize: 24 }} />
                                        </Box>
                                        <Box>
                                          <Typography variant="h6" fontWeight="600">
                                            Tình trạng sức khỏe vườn
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Đánh giá tổng quan dựa trên dữ liệu cảm biến và hình ảnh
                                          </Typography>
                                        </Box>
                                      </Box>
                                      
                                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h5" fontWeight="600" sx={{ mr: 2 }}>
                                          {analysis.result?.health_status || 'Không có thông tin'}
                                        </Typography>
                                        
                                        {analysis.result?.overallScore !== undefined && (
                                          <Chip 
                                            label={`Điểm đánh giá: ${analysis.result.overallScore}/100`} 
                                            color={
                                              analysis.result.overallScore >= 80 ? 'success' :
                                              analysis.result.overallScore >= 60 ? 'primary' :
                                              analysis.result.overallScore >= 40 ? 'warning' : 'error'
                                            }
                                            sx={{ 
                                              fontWeight: 600, 
                                              fontSize: '0.875rem',
                                              padding: '6px 2px',
                                              height: 32
                                            }}
                                          />
                                        )}
                                      </Box>
                                      
                                      <Divider sx={{ my: 2 }} />
                                      
                                      <Typography variant="body1" paragraph sx={{ lineHeight: 1.6 }}>
                                        {analysis.result?.summary || 'Không có thông tin tóm tắt'}
                                      </Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                  <Card className="card-container environment-card">
                                    <CardContent sx={{ p: 3 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box className="icon-circle">
                                          <SettingsIcon sx={{ fontSize: 24 }} />
                                        </Box>
                                        <Typography variant="h6" fontWeight="600">
                                          Đánh giá điều kiện môi trường
                                        </Typography>
                                      </Box>
                                      <Typography variant="body1" className="data-box environment-data">
                                        {analysis.result?.environment_assessment || 'Chưa có đánh giá'}
                                      </Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                  <Card className="card-container forecast-card">
                                    <CardContent sx={{ p: 3 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box className="icon-circle">
                                          <BarChartIcon sx={{ fontSize: 24 }} />
                                        </Box>
                                        <Typography variant="h6" fontWeight="600">
                                          Dự báo tình trạng vườn
                                        </Typography>
                                      </Box>
                                      <Typography variant="body1" className="data-box forecast-data">
                                        {analysis.result?.forecast || 'Chưa có dự báo'}
                                      </Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>
                                
                                <Grid item xs={12}>
                                  <Card className="card-container attention-card">
                                    <CardContent sx={{ p: 3 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box className="icon-circle">
                                          <PhotoCameraIcon sx={{ fontSize: 24 }} />
                                        </Box>
                                        <Typography variant="h6" fontWeight="600">
                                          Điểm cần chú ý
                                        </Typography>
                                      </Box>
                                      <Typography variant="body1" sx={{ 
                                        p: 2, 
                                        bgcolor: 'rgba(244, 67, 54, 0.05)', 
                                        borderRadius: 1,
                                        border: '1px solid rgba(244, 67, 54, 0.1)'
                                      }}>
                                        {analysis.result?.attention_points || 'Không có điểm cần chú ý'}
                                      </Typography>
                                    </CardContent>
                                  </Card>
                                </Grid>

                                {/* Hiển thị đề xuất nếu có */}
                                {analysis.result?.recommendations && analysis.result.recommendations.length > 0 && (
                                  <Grid item xs={12}>
                                    <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                      <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                          <Box sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: '50%', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            background: 'linear-gradient(45deg, #3F51B5, #9C27B0)',
                                            color: 'white',
                                            mr: 2
                                          }}>
                                            <TipsAndUpdatesIcon />
                                          </Box>
                                          <Typography variant="subtitle1" fontWeight="600">
                                            Đề xuất cải thiện
                                          </Typography>
                                        </Box>
                                        
                                        <List sx={{ 
                                          bgcolor: 'rgba(63, 81, 181, 0.05)', 
                                          borderRadius: 1,
                                          border: '1px solid rgba(63, 81, 181, 0.1)',
                                          p: 2 
                                        }}>
                                          {analysis.result.recommendations.map((recommendation, index) => (
                                            <ListItem 
                                              key={index}
                                              sx={{ 
                                                py: 1,
                                                borderBottom: index < analysis.result.recommendations.length - 1 ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none'
                                              }}
                                            >
                                              <ListItemIcon>
                                                <ArrowRightIcon color="primary" />
                                              </ListItemIcon>
                                              <ListItemText primary={recommendation} />
                                            </ListItem>
                                          ))}
                                        </List>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                )}
                                
                                {/* Hiển thị đề xuất thiết bị nếu có */}
                                {analysis.result?.device_recommendations && analysis.result.device_recommendations.length > 0 && (
                                  <Grid item xs={12}>
                                    <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                      <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box sx={{ 
                                              width: 40, 
                                              height: 40, 
                                              borderRadius: '50%', 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              justifyContent: 'center',
                                              background: 'linear-gradient(45deg, #4CAF50, #009688)',
                                              color: 'white',
                                              mr: 2
                                            }}>
                                              <DevicesIcon />
                                            </Box>
                                            <Typography variant="subtitle1" fontWeight="600">
                                              Đề xuất điều khiển thiết bị
                                            </Typography>
                                          </Box>
                                          
                                          <Button
                                            variant="contained"
                                            className="gradient-button"
                                            disabled={applyingSuggestions}
                                            onClick={handleApplySuggestions}
                                            startIcon={applyingSuggestions ? <CircularProgress size={18} /> : <PlayArrowIcon />}
                                          >
                                            {applyingSuggestions ? 'Đang áp dụng...' : 'Áp dụng đề xuất'}
                                          </Button>
                                        </Box>
                                        
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                          AI đề xuất lịch trình tự động sau đây để tối ưu hoá sức khỏe vườn của bạn:
                                        </Typography>
                                        
                                        <TableContainer component={Paper} variant="outlined" sx={{ 
                                          bgcolor: 'rgba(76, 175, 80, 0.05)', 
                                          border: '1px solid rgba(76, 175, 80, 0.1)' 
                                        }}>
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                                                <TableCell>Thiết bị</TableCell>
                                                <TableCell>Thời gian</TableCell>
                                                <TableCell>Hành động</TableCell>
                                                <TableCell>Ngày trong tuần</TableCell>
                                                <TableCell>Chi tiết</TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {analysis.result.device_recommendations.map((recommendation, index) => (
                                                <TableRow key={index} hover>
                                                  <TableCell>
                                                    {recommendation.device === 'PUMP' && 'Máy bơm 1'}
                                                    {recommendation.device === 'PUMP2' && 'Máy bơm 2'}
                                                    {recommendation.device === 'PUMP_2' && 'Máy bơm 2'}
                                                    {recommendation.device === 'FAN' && 'Quạt'}
                                                    {recommendation.device === 'LIGHT' && 'Đèn'}
                                                  </TableCell>
                                                  <TableCell>{recommendation.time}</TableCell>
                                                  <TableCell>
                                                    <Chip 
                                                      label={recommendation.action ? "BẬT" : "TẮT"} 
                                                      color={recommendation.action ? "success" : "default"} 
                                                      size="small" 
                                                    />
                                                  </TableCell>
                                                  <TableCell>
                                                    {Array.isArray(recommendation.days) && recommendation.days.map(day => getDayNameVi(day)).join(', ')}
                                                  </TableCell>
                                                  <TableCell>
                                                    {recommendation.description || '-'}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                )}
                                
                                {/* Hiển thị phân tích hình ảnh nếu có */}
                                {analysis.result?.image_analysis && (
                                  <Grid item xs={12}>
                                    <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mt: 2 }}>
                                      <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                          <Box sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: '50%', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            background: 'linear-gradient(45deg, #2196F3, #00BCD4)',
                                            color: 'white',
                                            mr: 2
                                          }}>
                                            <PhotoCameraIcon />
                                          </Box>
                                          <Typography variant="subtitle1" fontWeight="600">
                                            Phân tích hình ảnh vườn
                                          </Typography>
                                        </Box>
                                        
                                        <Grid container spacing={2}>
                                          {/* Hiển thị vấn đề phát hiện được */}
                                          {analysis.result.image_analysis.issues_detected && analysis.result.image_analysis.issues_detected.length > 0 && (
                                            <Grid item xs={12} md={6}>
                                              <Box sx={{ 
                                                p: 2, 
                                                bgcolor: 'rgba(244, 67, 54, 0.05)', 
                                                borderRadius: 1,
                                                border: '1px solid rgba(244, 67, 54, 0.1)',
                                                height: '100%'
                                              }}>
                                                <Typography variant="subtitle2" color="error" fontWeight="600" gutterBottom>
                                                  Vấn đề phát hiện được:
                                                </Typography>
                                                <List dense disablePadding>
                                                  {analysis.result.image_analysis.issues_detected.map((issue, idx) => (
                                                    <ListItem key={idx} sx={{ py: 0.5 }}>
                                                      <ListItemIcon sx={{ minWidth: 36 }}>
                                                        <ErrorOutlineIcon color="error" fontSize="small" />
                                                      </ListItemIcon>
                                                      <ListItemText primary={issue} />
                                                    </ListItem>
                                                  ))}
                                                </List>
                                              </Box>
                                            </Grid>
                                          )}
                                          
                                          {/* Hiển thị đánh giá tăng trưởng */}
                                          {analysis.result.image_analysis.growth_assessment && (
                                            <Grid item xs={12} md={6}>
                                              <Box sx={{ 
                                                p: 2, 
                                                bgcolor: 'rgba(76, 175, 80, 0.05)', 
                                                borderRadius: 1,
                                                border: '1px solid rgba(76, 175, 80, 0.1)',
                                                height: '100%'
                                              }}>
                                                <Typography variant="subtitle2" color="success.main" fontWeight="600" gutterBottom>
                                                  Đánh giá tăng trưởng:
                                                </Typography>
                                                <Typography variant="body2">
                                                  {analysis.result.image_analysis.growth_assessment}
                                                </Typography>
                                              </Box>
                                            </Grid>
                                          )}
                                          
                                          {/* Hiển thị thiếu hụt dinh dưỡng */}
                                          {analysis.result.image_analysis.nutrient_deficiencies && analysis.result.image_analysis.nutrient_deficiencies.length > 0 && (
                                            <Grid item xs={12} md={6}>
                                              <Box sx={{ 
                                                p: 2, 
                                                bgcolor: 'rgba(255, 193, 7, 0.05)', 
                                                borderRadius: 1,
                                                border: '1px solid rgba(255, 193, 7, 0.1)',
                                                height: '100%'
                                              }}>
                                                <Typography variant="subtitle2" color="warning.main" fontWeight="600" gutterBottom>
                                                  Thiếu hụt dinh dưỡng:
                                                </Typography>
                                                <List dense disablePadding>
                                                  {analysis.result.image_analysis.nutrient_deficiencies.map((deficiency, idx) => (
                                                    <ListItem key={idx} sx={{ py: 0.5 }}>
                                                      <ListItemIcon sx={{ minWidth: 36 }}>
                                                        <WarningAmberIcon color="warning" fontSize="small" />
                                                      </ListItemIcon>
                                                      <ListItemText primary={deficiency} />
                                                    </ListItem>
                                                  ))}
                                                </List>
                                              </Box>
                                            </Grid>
                                          )}
                                          
                                          {/* Hiển thị dịch bệnh và côn trùng */}
                                          {analysis.result.image_analysis.pests_and_diseases && analysis.result.image_analysis.pests_and_diseases.length > 0 && (
                                            <Grid item xs={12} md={6}>
                                              <Box sx={{ 
                                                p: 2, 
                                                bgcolor: 'rgba(156, 39, 176, 0.05)', 
                                                borderRadius: 1,
                                                border: '1px solid rgba(156, 39, 176, 0.1)',
                                                height: '100%'
                                              }}>
                                                <Typography variant="subtitle2" color="secondary.main" fontWeight="600" gutterBottom>
                                                  Dịch bệnh và côn trùng:
                                                </Typography>
                                                <List dense disablePadding>
                                                  {analysis.result.image_analysis.pests_and_diseases.map((pest, idx) => (
                                                    <ListItem key={idx} sx={{ py: 0.5 }}>
                                                      <ListItemIcon sx={{ minWidth: 36 }}>
                                                        <BugReportIcon color="secondary" fontSize="small" />
                                                      </ListItemIcon>
                                                      <ListItemText primary={pest} />
                                                    </ListItem>
                                                  ))}
                                                </List>
                                              </Box>
                                            </Grid>
                                          )}
                                          
                                          {/* Hiển thị đánh giá màu sắc */}
                                          {analysis.result.image_analysis.color_assessment && (
                                            <Grid item xs={12}>
                                              <Box sx={{ 
                                                p: 2, 
                                                bgcolor: 'rgba(3, 169, 244, 0.05)', 
                                                borderRadius: 1,
                                                border: '1px solid rgba(3, 169, 244, 0.1)'
                                              }}>
                                                <Typography variant="subtitle2" color="info.main" fontWeight="600" gutterBottom>
                                                  Đánh giá màu sắc:
                                                </Typography>
                                                <Typography variant="body2">
                                                  {analysis.result.image_analysis.color_assessment}
                                                </Typography>
                                              </Box>
                                            </Grid>
                                          )}
                                        </Grid>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          ) : (
                            <Box sx={{ 
                              p: 4, 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              bgcolor: 'rgba(255, 255, 255, 0.7)',
                              borderRadius: 2,
                              border: '1px dashed #bdbdbd'
                            }}>
                              <BarChartIcon sx={{ fontSize: 60, color: 'action.disabled', mb: 2 }} />
                              <Typography variant="h6" color="text.secondary" gutterBottom>
                                Chưa có phân tích nào
                              </Typography>
                              <Typography variant="body1" color="text.secondary" textAlign="center" paragraph>
                                Hãy nhấn "Phân tích mới" để AI phân tích vườn của bạn và nhận các đề xuất!
                              </Typography>
                              <Button 
                                variant="outlined" 
                                color="primary"
                                onClick={handleAnalyzeGarden}
                                startIcon={<BarChartIcon />}
                                sx={{ mt: 2, borderRadius: '20px', px: 3 }}
                              >
                                Bắt đầu phân tích
                              </Button>
                            </Box>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Tab lịch sử phân tích */}
                    <div role="tabpanel" hidden={analysisTabValue !== 1}>
                      {analysisTabValue === 1 && (
                        <>
                          {loadingHistory ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                              <CircularProgress />
                            </Box>
                          ) : analysisHistory.length > 0 ? (
                            <>
                              <Typography variant="h6" gutterBottom fontWeight="medium" sx={{ mb: 3 }}>
                                Lịch sử phân tích ({analysisHistory.length})
                              </Typography>
                              
                              <TableContainer component={Paper} variant="outlined">
                                <Table>
                                  <TableHead>
                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                      <TableCell>Thời gian</TableCell>
                                      <TableCell>Đánh giá</TableCell>
                                      <TableCell>Điểm</TableCell>
                                      <TableCell align="right">Thao tác</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {analysisHistory.map((item, index) => (
                                      <TableRow key={item._id || index} hover>
                                        <TableCell>
                                          {new Date(item.timestamp).toLocaleString('vi-VN', {
                                            year: 'numeric',
                                            month: 'numeric',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                          <Typography variant="caption" display="block" color="text.secondary">
                                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: vi })}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          {item.result?.health_status || 'Không có thông tin'}
                                        </TableCell>
                                        <TableCell>
                                          {item.result?.overallScore !== undefined ? (
                                            <Chip 
                                              label={`${item.result.overallScore}/100`} 
                                              color={
                                                item.result.overallScore >= 80 ? 'success' :
                                                item.result.overallScore >= 60 ? 'primary' :
                                                item.result.overallScore >= 40 ? 'warning' : 'error'
                                              }
                                              size="small"
                                            />
                                          ) : (
                                            'N/A'
                                          )}
                                        </TableCell>
                                        <TableCell align="right">
                                          <IconButton
                                            size="small"
                                            onClick={() => handleViewHistoryAnalysis(item)}
                                            title="Xem chi tiết phân tích"
                                            sx={{ mr: 1 }}
                                          >
                                            <VisibilityIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleDeleteAnalysis(item._id)}
                                            title="Xóa phân tích này"
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </>
                          ) : (
                            <Box sx={{ textAlign: 'center', p: 4 }}>
                              <HistoryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                              <Typography variant="h6" color="text.secondary" gutterBottom>
                                Chưa có lịch sử phân tích
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Lịch sử phân tích sẽ hiển thị ở đây sau khi bạn thực hiện phân tích vườn
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                    </div>
                  </Paper>
                </Grid>
                
                {analysis && analysis.result && (
                  <Grid item xs={12}>
                    <Paper 
                      elevation={3} 
                      sx={{ 
                        p: 3, 
                        borderRadius: 2,
                        background: 'linear-gradient(to right, #ffffff, #f9f9f9)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BarChartIcon sx={{ color: 'secondary.main', mr: 1 }} />
                        <Typography variant="h6" fontWeight="600" color="secondary.main">
                          Chi tiết phân tích
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 3, opacity: 0.6 }} />
                      
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Card sx={{ 
                            mb: 2, 
                            borderRadius: 2, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            transition: 'transform 0.3s, box-shadow 0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                            }
                          }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box 
                                  sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                                    color: 'white',
                                    mr: 2
                                  }}
                                >
                                  <RefreshIcon />
                                </Box>
                                <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                                  Tình trạng sức khỏe vườn
                                </Typography>
                              </Box>
                              <Typography variant="body1" sx={{ 
                                p: 2, 
                                bgcolor: 'rgba(76, 175, 80, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(76, 175, 80, 0.1)'
                              }}>
                                {analysis.result.health_status || 'Chưa có đánh giá'}
                              </Typography>
                            </CardContent>
                          </Card>
                          
                          <Card sx={{ 
                            borderRadius: 2, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            transition: 'transform 0.3s, box-shadow 0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                            }
                          }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box 
                                  sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    background: 'linear-gradient(45deg, #2196F3, #03A9F4)',
                                    color: 'white',
                                    mr: 2
                                  }}
                                >
                                  <SettingsIcon />
                                </Box>
                                <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                                  Đánh giá điều kiện môi trường
                                </Typography>
                              </Box>
                              <Typography variant="body1" sx={{ 
                                p: 2, 
                                bgcolor: 'rgba(33, 150, 243, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(33, 150, 243, 0.1)'
                              }}>
                                {analysis.result.environment_assessment || 'Chưa có đánh giá'}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card sx={{ 
                            mb: 2, 
                            borderRadius: 2, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            transition: 'transform 0.3s, box-shadow 0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                            }
                          }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box 
                                  sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    background: 'linear-gradient(45deg, #FF9800, #FFC107)',
                                    color: 'white',
                                    mr: 2
                                  }}
                                >
                                  <BarChartIcon />
                                </Box>
                                <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                                  Dự báo tình trạng vườn
                                </Typography>
                              </Box>
                              <Typography variant="body1" sx={{ 
                                p: 2, 
                                bgcolor: 'rgba(255, 152, 0, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(255, 152, 0, 0.1)'
                              }}>
                                {analysis.result.forecast || 'Chưa có dự báo'}
                              </Typography>
                            </CardContent>
                          </Card>
                          
                          <Card sx={{ 
                            borderRadius: 2, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            transition: 'transform 0.3s, box-shadow 0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                            }
                          }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box 
                                  sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    background: 'linear-gradient(45deg, #F44336, #FF5722)',
                                    color: 'white',
                                    mr: 2
                                  }}
                                >
                                  <PhotoCameraIcon />
                                </Box>
                                <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                                  Điểm cần chú ý
                                </Typography>
                              </Box>
                              <Typography variant="body1" sx={{ 
                                p: 2, 
                                bgcolor: 'rgba(244, 67, 54, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(244, 67, 54, 0.1)'
                              }}>
                                {analysis.result?.attention_points || 'Không có điểm cần chú ý'}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}
          </div>
        </Box>
      </Container>
      
      {/* Dialog hiển thị chi tiết phân tích từ lịch sử */}
      <Dialog 
        open={viewHistoryDialogOpen} 
        onClose={handleCloseHistoryDialog}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(to right, #f5f7fa, #ffffff)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Chi tiết phân tích</Typography>
          </Box>
          <IconButton onClick={handleCloseHistoryDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedHistoryAnalysis ? (
            <>
              <Box sx={{ 
                mb: 3, 
                p: 2, 
                borderRadius: 2, 
                bgcolor: 'rgba(33, 150, 243, 0.05)', 
                border: '1px solid rgba(33, 150, 243, 0.1)'
              }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="500">
                  Phân tích được thực hiện vào:
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {new Date(selectedHistoryAnalysis.timestamp).toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                          color: 'white',
                          mr: 2
                        }}>
                          <BarChartIcon />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="600">
                            Tình trạng sức khỏe vườn
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Đánh giá tổng quan dựa trên dữ liệu cảm biến và hình ảnh
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" fontWeight="600" sx={{ mr: 2 }}>
                          {selectedHistoryAnalysis.result?.health_status || 'Không có thông tin'}
                        </Typography>
                        
                        {selectedHistoryAnalysis.result?.overallScore !== undefined && (
                          <Chip 
                            label={`Điểm đánh giá: ${selectedHistoryAnalysis.result.overallScore}/100`} 
                            color={
                              selectedHistoryAnalysis.result.overallScore >= 80 ? 'success' :
                              selectedHistoryAnalysis.result.overallScore >= 60 ? 'primary' :
                              selectedHistoryAnalysis.result.overallScore >= 40 ? 'warning' : 'error'
                            }
                          />
                        )}
                      </Box>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="body1" paragraph>
                        {selectedHistoryAnalysis.result?.summary || 'Không có thông tin tóm tắt'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    mb: 2, 
                    height: '100%',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: 'linear-gradient(45deg, #2196F3, #03A9F4)',
                          color: 'white',
                          mr: 2
                        }}>
                          <SettingsIcon />
                        </Box>
                        <Typography variant="subtitle1" fontWeight="600">
                          Đánh giá điều kiện môi trường
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ 
                        p: 2, 
                        bgcolor: 'rgba(33, 150, 243, 0.05)', 
                        borderRadius: 1,
                        border: '1px solid rgba(33, 150, 243, 0.1)'
                      }}>
                        {selectedHistoryAnalysis.result?.environment_assessment || 'Chưa có đánh giá'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    mb: 2, 
                    height: '100%',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: 'linear-gradient(45deg, #FF9800, #FFC107)',
                          color: 'white',
                          mr: 2
                        }}>
                          <BarChartIcon />
                        </Box>
                        <Typography variant="subtitle1" fontWeight="600">
                          Dự báo tình trạng vườn
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ 
                        p: 2, 
                        bgcolor: 'rgba(255, 152, 0, 0.05)', 
                        borderRadius: 1,
                        border: '1px solid rgba(255, 152, 0, 0.1)'
                      }}>
                        {selectedHistoryAnalysis.result?.forecast || 'Chưa có dự báo'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: 'linear-gradient(45deg, #F44336, #FF5722)',
                          color: 'white',
                          mr: 2
                        }}>
                          <PhotoCameraIcon />
                        </Box>
                        <Typography variant="subtitle1" fontWeight="600">
                          Điểm cần chú ý
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ 
                        p: 2, 
                        bgcolor: 'rgba(244, 67, 54, 0.05)', 
                        borderRadius: 1,
                        border: '1px solid rgba(244, 67, 54, 0.1)'
                      }}>
                        {selectedHistoryAnalysis.result?.attention_points || 'Không có điểm cần chú ý'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Hiển thị đề xuất nếu có */}
                {selectedHistoryAnalysis.result?.recommendations && selectedHistoryAnalysis.result.recommendations.length > 0 && (
                  <Grid item xs={12}>
                    <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: 'linear-gradient(45deg, #3F51B5, #9C27B0)',
                            color: 'white',
                            mr: 2
                          }}>
                            <TipsAndUpdatesIcon />
                          </Box>
                          <Typography variant="subtitle1" fontWeight="600">
                            Đề xuất cải thiện
                          </Typography>
                        </Box>
                        
                        <List sx={{ 
                          bgcolor: 'rgba(63, 81, 181, 0.05)', 
                          borderRadius: 1,
                          border: '1px solid rgba(63, 81, 181, 0.1)',
                          p: 2 
                        }}>
                          {selectedHistoryAnalysis.result.recommendations.map((recommendation, index) => (
                            <ListItem 
                              key={index}
                              sx={{ 
                                py: 1,
                                borderBottom: index < selectedHistoryAnalysis.result.recommendations.length - 1 ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none'
                              }}
                            >
                              <ListItemIcon>
                                <ArrowRightIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText primary={recommendation} />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                
                {/* Hiển thị đề xuất thiết bị nếu có */}
                {selectedHistoryAnalysis.result?.device_recommendations && selectedHistoryAnalysis.result.device_recommendations.length > 0 && (
                  <Grid item xs={12}>
                    <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: 'linear-gradient(45deg, #4CAF50, #009688)',
                            color: 'white',
                            mr: 2
                          }}>
                            <DevicesIcon />
                          </Box>
                          <Typography variant="subtitle1" fontWeight="600">
                            Đề xuất điều khiển thiết bị
                          </Typography>
                        </Box>
                        
                        <TableContainer component={Paper} variant="outlined" sx={{ 
                          bgcolor: 'rgba(76, 175, 80, 0.05)', 
                          border: '1px solid rgba(76, 175, 80, 0.1)' 
                        }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                                <TableCell>Thiết bị</TableCell>
                                <TableCell>Thời gian</TableCell>
                                <TableCell>Hành động</TableCell>
                                <TableCell>Ngày trong tuần</TableCell>
                                <TableCell>Chi tiết</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedHistoryAnalysis.result.device_recommendations.map((recommendation, index) => (
                                <TableRow key={index} hover>
                                  <TableCell>
                                    {recommendation.device === 'PUMP' && 'Máy bơm 1'}
                                    {recommendation.device === 'PUMP2' && 'Máy bơm 2'}
                                    {recommendation.device === 'PUMP_2' && 'Máy bơm 2'}
                                    {recommendation.device === 'FAN' && 'Quạt'}
                                    {recommendation.device === 'LIGHT' && 'Đèn'}
                                  </TableCell>
                                  <TableCell>{recommendation.time}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={recommendation.action ? "BẬT" : "TẮT"} 
                                      color={recommendation.action ? "success" : "default"} 
                                      size="small" 
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {Array.isArray(recommendation.days) && recommendation.days.map(day => getDayNameVi(day)).join(', ')}
                                  </TableCell>
                                  <TableCell>
                                    {recommendation.description || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                
                {/* Hiển thị phân tích hình ảnh nếu có */}
                {selectedHistoryAnalysis.result?.image_analysis && (
                  <Grid item xs={12}>
                    <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mt: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: 'linear-gradient(45deg, #2196F3, #00BCD4)',
                            color: 'white',
                            mr: 2
                          }}>
                            <PhotoCameraIcon />
                          </Box>
                          <Typography variant="subtitle1" fontWeight="600">
                            Phân tích hình ảnh vườn
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                          {/* Hiển thị vấn đề phát hiện được */}
                          {selectedHistoryAnalysis.result.image_analysis.issues_detected && selectedHistoryAnalysis.result.image_analysis.issues_detected.length > 0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom fontWeight="500">
                                Vấn đề phát hiện được:
                              </Typography>
                              <Box sx={{ 
                                bgcolor: 'rgba(244, 67, 54, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(244, 67, 54, 0.1)',
                                p: 1.5
                              }}>
                                <List dense disablePadding>
                                  {selectedHistoryAnalysis.result.image_analysis.issues_detected.map((issue, index) => (
                                    <ListItem key={index} sx={{ py: 0.5 }}>
                                      <ListItemIcon sx={{ minWidth: 36 }}>
                                        <ErrorIcon color="error" fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText primary={issue} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            </Grid>
                          )}
                          
                          {/* Hiển thị đánh giá sự phát triển */}
                          {selectedHistoryAnalysis.result.image_analysis.growth_assessment && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom fontWeight="500">
                                Đánh giá sự phát triển:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                p: 1.5, 
                                bgcolor: 'rgba(76, 175, 80, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(76, 175, 80, 0.1)'
                              }}>
                                {selectedHistoryAnalysis.result.image_analysis.growth_assessment}
                              </Typography>
                            </Grid>
                          )}
                          
                          {/* Hiển thị thiếu dinh dưỡng */}
                          {selectedHistoryAnalysis.result.image_analysis.nutrient_deficiencies && selectedHistoryAnalysis.result.image_analysis.nutrient_deficiencies.length > 0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom fontWeight="500">
                                Thiếu dinh dưỡng:
                              </Typography>
                              <Box sx={{ 
                                bgcolor: 'rgba(255, 152, 0, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(255, 152, 0, 0.1)',
                                p: 1.5
                              }}>
                                <List dense disablePadding>
                                  {selectedHistoryAnalysis.result.image_analysis.nutrient_deficiencies.map((deficiency, index) => (
                                    <ListItem key={index} sx={{ py: 0.5 }}>
                                      <ListItemIcon sx={{ minWidth: 36 }}>
                                        <InfoIcon color="warning" fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText primary={deficiency} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            </Grid>
                          )}
                          
                          {/* Hiển thị sâu bệnh */}
                          {selectedHistoryAnalysis.result.image_analysis.pests_diseases && selectedHistoryAnalysis.result.image_analysis.pests_diseases.length > 0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom fontWeight="500">
                                Sâu bệnh:
                              </Typography>
                              <Box sx={{ 
                                bgcolor: 'rgba(156, 39, 176, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(156, 39, 176, 0.1)',
                                p: 1.5
                              }}>
                                <List dense disablePadding>
                                  {selectedHistoryAnalysis.result.image_analysis.pests_diseases.map((pest, index) => (
                                    <ListItem key={index} sx={{ py: 0.5 }}>
                                      <ListItemIcon sx={{ minWidth: 36 }}>
                                        <BugReportIcon color="secondary" fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText primary={pest} />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            </Grid>
                          )}
                          
                          {/* Hiển thị đánh giá màu sắc */}
                          {selectedHistoryAnalysis.result.image_analysis.color_assessment && (
                            <Grid item xs={12}>
                              <Typography variant="subtitle2" gutterBottom fontWeight="500">
                                Đánh giá màu sắc:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                p: 1.5, 
                                bgcolor: 'rgba(33, 150, 243, 0.05)', 
                                borderRadius: 1,
                                border: '1px solid rgba(33, 150, 243, 0.1)'
                              }}>
                                {selectedHistoryAnalysis.result.image_analysis.color_assessment}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body1">Đang tải dữ liệu phân tích...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoryDialog}>Đóng</Button>
          {selectedHistoryAnalysis && selectedHistoryAnalysis.result && selectedHistoryAnalysis.result.device_recommendations && selectedHistoryAnalysis.result.device_recommendations.length > 0 && (
            <Button 
              onClick={() => {
                setAnalysis(selectedHistoryAnalysis);
                handleApplySuggestions();
                handleCloseHistoryDialog();
              }}
              variant="contained" 
              color="success"
              startIcon={<PlayArrowIcon />}
            >
              Áp dụng đề xuất
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default GardenDetail; 
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useMascot } from '../components/Mascot/MascotContext'; 
import MainLayout from '../components/Layout/MainLayout';
import { sensorService, deviceService, analysisService } from '../services'; 
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Container,
  Grid,
  Typography,
  Box,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Thermostat,
  Opacity,
  WbSunny,
  AirOutlined,
  Grass,
  WaterDrop,
  GrassOutlined,
} from '@mui/icons-material';
// Removed Line import, now in ChartDisplay
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

// Import the new components
import SensorDataDisplay from '../components/Dashboard/SensorDataDisplay';
import WelcomeCard from '../components/Dashboard/WelcomeCard';
import DeviceControlCard from '../components/Dashboard/DeviceControlCard';
import ChartDisplay from '../components/Dashboard/ChartDisplay';

// Register Chart.js components 
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Removed SensorDataDisplay component definition

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentGarden, gardens, loading: gardensLoading, error: gardensError } = useGarden();
  const { subscribe, unsubscribe, joinGardenRoom } = useSocket();
  const { currentUser } = useAuth();
  const { setHappy, setSad } = useMascot(); // Use the Mascot context hook
  const refreshTimerRef = useRef(null);
  const theme = useTheme(); // Keep theme for general use if needed
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Keep for layout adjustments
  // const isTablet = useMediaQuery(theme.breakpoints.down('md')); // Keep if needed

  const [selectedGarden, setSelectedGarden] = useState(null);
  // const [selectedGardenId, setSelectedGardenId] = useState(null); // selectedGarden._id is sufficient
  const [sensorData, setSensorData] = useState(null); // Keep state
  const [deviceStates, setDeviceStates] = useState({ // Keep state
    fan: false, light: false, pump: false, pump2: false, auto: false,
  });
  const [loading, setLoading] = useState(true); // Keep state (overall loading)
  const [dataLoading, setDataLoading] = useState(true); // Keep state (sensor specific loading)
  const [error, setError] = useState(null); // Keep state
  const [chartData, setChartData] = useState(null); // Keep state
  const [lastUpdated, setLastUpdated] = useState(null); // Keep state
  const [analysisData, setAnalysisData] = useState(null); // Keep state
  const [loadingAnalysis, setLoadingAnalysis] = useState(false); // Keep state

  const [cooldowns, setCooldowns] = useState({ // Keep state
    FAN: 0, LIGHT: 0, PUMP: 0, PUMP_2: 0
  });
  const cooldownTimersRef = useRef({}); // Keep state


  // --- Existing useEffects and handlers ---

  // Effect to set initial selected garden
  useEffect(() => {
    const initialGardenId = localStorage.getItem('selectedGarden');
    let initialGarden = null;

    if (initialGardenId) {
        initialGarden = gardens.find(g => g._id === initialGardenId);
    }
    // Fallback logic
    if (!initialGarden) {
        if (currentGarden) {
             initialGarden = currentGarden;
        } else if (gardens.length > 0) {
            initialGarden = gardens[0];
        }
    }

    if (initialGarden) {
        setSelectedGarden(initialGarden);
        if (initialGarden._id) { // Only save if ID exists
           localStorage.setItem('selectedGarden', initialGarden._id);
        }
        // Initial mascot state
        if (initialGarden.is_connected) {
            setHappy();
        } else {
            setSad();
        }
    } else {
         localStorage.removeItem('selectedGarden'); // Clean up if no valid garden found
    }

  }, [currentGarden, gardens, setHappy, setSad]); // Added dependencies

  // Effect for auto-refresh timer
  useEffect(() => {
    if (selectedGarden) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      refreshTimerRef.current = setInterval(() => {
        const now = new Date();
        if (lastUpdated && (now.getTime() - lastUpdated.getTime()) > 60000) {
          console.log('Auto-refreshing data due to inactivity...');
          loadData(selectedGarden._id); // Pass ID to loadData
        }
      }, 60000);
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [selectedGarden, lastUpdated]); // loadData dependency removed as it's stable

  // Effect to load data and subscribe/unsubscribe based on selectedGarden
  useEffect(() => {
    if (selectedGarden?._id) {
      const gardenId = selectedGarden._id;
      console.log(`Selected garden changed to: ${gardenId}`);

      // Load initial data from localStorage
      const savedSensorData = localStorage.getItem(`sensorData_${gardenId}`);
      const savedDeviceStates = localStorage.getItem(`deviceStates_${gardenId}`);
      const savedAnalysis = localStorage.getItem(`analysis_${gardenId}`);

      // Reset states before loading potentially stale localStorage data
      setSensorData(null);
      setDeviceStates({ fan: false, light: false, pump: false, pump2: false, auto: false });
      setChartData(null);
      setAnalysisData(null);
      setError(null); // Clear previous errors
      setDataLoading(true); // Indicate loading starts
      setLoadingAnalysis(true); // Indicate analysis loading starts

      if (savedSensorData) {
        try {
          setSensorData(JSON.parse(savedSensorData));
          // Don't set dataLoading false yet, wait for fresh data
        } catch (e) { console.error("Error parsing saved sensor data", e); localStorage.removeItem(`sensorData_${gardenId}`); }
      }
      if (savedDeviceStates) {
         try {
           setDeviceStates(JSON.parse(savedDeviceStates));
         } catch (e) { console.error("Error parsing saved device states", e); localStorage.removeItem(`deviceStates_${gardenId}`); }
      }
      if (savedAnalysis) {
         try {
            setAnalysisData(JSON.parse(savedAnalysis));
             // Don't set loadingAnalysis false yet
         } catch (e) { console.error("Error parsing saved analysis data", e); localStorage.removeItem(`analysis_${gardenId}`); }
      }

      // Fetch fresh data
      loadData(gardenId);
      fetchLatestAnalysis(gardenId); // Fetch analysis

      // Socket operations
      joinGardenRoom(gardenId);
      subscribe('sensor_data_update', handleSensorDataUpdate);
      subscribe('device_status_update', handleDeviceStatusUpdate);

      return () => {
        console.log(`Unsubscribing from garden: ${gardenId}`);
        unsubscribe('sensor_data_update', handleSensorDataUpdate);
        unsubscribe('device_status_update', handleDeviceStatusUpdate);
        // Optionally leave room? Depends on socket server logic
      };
    } else {
       // Reset states if no garden is selected
       setSensorData(null);
       setDeviceStates({ fan: false, light: false, pump: false, pump2: false, auto: false });
       setChartData(null);
       setAnalysisData(null);
       setDataLoading(false);
       setLoadingAnalysis(false);
       setLoading(false);
       setError(null);
       setLastUpdated(null);
    }
  }, [selectedGarden, subscribe, unsubscribe, joinGardenRoom]); // Dependencies

  // Effect to save sensor data to localStorage
  useEffect(() => {
    if (sensorData && selectedGarden?._id) {
      localStorage.setItem(`sensorData_${selectedGarden._id}`, JSON.stringify(sensorData));
      setLastUpdated(new Date()); // Update timestamp when data is saved/received
    }
  }, [sensorData, selectedGarden]);

  // Effect to save device states to localStorage
  useEffect(() => {
    if (selectedGarden?._id) {
      localStorage.setItem(`deviceStates_${selectedGarden._id}`, JSON.stringify(deviceStates));
    }
  }, [deviceStates, selectedGarden]);

    // Effect to save analysis data to localStorage
    useEffect(() => {
        if (analysisData && selectedGarden?._id) {
          localStorage.setItem(`analysis_${selectedGarden._id}`, JSON.stringify(analysisData));
        }
      }, [analysisData, selectedGarden]);


  // Effect to clear cooldown timers on unmount
  useEffect(() => {
    return () => {
      Object.values(cooldownTimersRef.current).forEach(timerId => {
        if (timerId) clearInterval(timerId);
      });
    };
  }, []);


  // --- Data Loading and Handling Functions ---

  const loadData = async (gardenId) => { // Accept gardenId
    if (!gardenId) return;

    console.log(`Loading data for garden: ${gardenId}`);
    // Don't set loading(true) here, let the initial effect handle it
    if (!sensorData) setDataLoading(true); // Only set sensor loading if no cached data exists
    // setError(null); // Clear error before new fetch

    try {
      // Fetch sensor, device, and history data concurrently
      const [sensorResponse, deviceResponse, historyResponse] = await Promise.allSettled([
        sensorService.getLatestData(gardenId),
        deviceService.getDevices(gardenId),
        sensorService.getDataHistory(gardenId, { limit: 24 }) // Fetch chart data here
      ]);

      // Process sensor data
      if (sensorResponse.status === 'fulfilled' && sensorResponse.value.data) {
        console.log("Sensor data fetched:", sensorResponse.value.data);
        setSensorData(sensorResponse.value.data);
        // setLastUpdated(new Date()); // Updated in the effect that saves sensorData
      } else {
        console.error('Failed to fetch sensor data:', sensorResponse.reason);
        // setError(prev => prev || sensorResponse.reason?.response?.data?.message || 'Không thể tải dữ liệu cảm biến.');
      }

      // Process device states
      if (deviceResponse.status === 'fulfilled' && deviceResponse.value.devices) {
        console.log("Device states fetched:", deviceResponse.value.devices);
        setDeviceStates({
          fan: deviceResponse.value.devices.fan || false,
          light: deviceResponse.value.devices.light || false,
          pump: deviceResponse.value.devices.pump || false,
          pump2: deviceResponse.value.devices.pump2 || false,
          auto: deviceResponse.value.devices.auto_mode || false,
        });
      } else {
        console.error('Failed to fetch device states:', deviceResponse.reason);
         // setError(prev => prev || deviceResponse.reason?.response?.data?.message || 'Không thể tải trạng thái thiết bị.');
      }

      // Process history data for chart
      if (historyResponse.status === 'fulfilled' && historyResponse.value.data) {
        console.log("History data fetched:", historyResponse.value.data);
        prepareChartData(historyResponse.value.data);
      } else {
        console.error('Failed to fetch history data:', historyResponse.reason);
        setChartData(null); // Clear chart on error
        // setError(prev => prev || historyResponse.reason?.response?.data?.message || 'Không thể tải dữ liệu biểu đồ.');
      }

       // Combine potential errors (show first one for simplicity)
       const firstError = [sensorResponse, deviceResponse, historyResponse].find(r => r.status === 'rejected');
       if (firstError) {
           setError(firstError.reason?.response?.data?.message || 'Lỗi tải dữ liệu. Vui lòng thử lại.');
       } else {
           setError(null); // Clear error if all succeed
       }


    } catch (err) { // Catch unexpected errors during Promise.allSettled or setup
      console.error('Unexpected error in loadData:', err);
      setError('Lỗi không mong muốn xảy ra khi tải dữ liệu.');
      setSensorData(null); // Reset states on major error
      setDeviceStates({ fan: false, light: false, pump: false, pump2: false, auto: false });
      setChartData(null);
    } finally {
      setLoading(false); // Overall loading finished
      setDataLoading(false); // Sensor/device data loading finished
    }
  };

  const prepareChartData = (historyData) => {
    if (!historyData || !historyData.length) {
        setChartData(null); // Ensure chart is cleared if no data
        return;
    }

    const data = [...historyData].reverse(); // Ensure chronological order

    const labels = data.map(item => {
      try {
          const date = new Date(item.timestamp);
          if (isNaN(date.getTime())) throw new Error('Invalid date');
          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      } catch (e) {
          console.error("Error parsing timestamp for chart:", item.timestamp, e);
          return 'N/A'; // Fallback label
      }
    });

    // Filter out entries with invalid labels if needed, though Chart.js might handle it
    const validDataIndices = labels.map((label, index) => label !== 'N/A' ? index : -1).filter(index => index !== -1);
    const filteredLabels = validDataIndices.map(index => labels[index]);
    const filteredData = validDataIndices.map(index => data[index]);


    setChartData({
      labels: filteredLabels,
      datasets: [
        { label: 'Nhiệt độ (°C)', data: filteredData.map(item => item.temperature ?? null), borderColor: '#FF6384', backgroundColor: 'rgba(255, 99, 132, 0.5)', yAxisID: 'y', tension: 0.1 },
        { label: 'Độ ẩm KK (%)', data: filteredData.map(item => item.humidity ?? null), borderColor: '#36A2EB', backgroundColor: 'rgba(54, 162, 235, 0.5)', yAxisID: 'y', tension: 0.1 },
        { label: 'Ánh sáng (%)', data: filteredData.map(item => item.light ?? null), borderColor: '#FFCE56', backgroundColor: 'rgba(255, 206, 86, 0.5)', yAxisID: 'y', tension: 0.1 },
        { label: 'Độ ẩm đất (%)', data: filteredData.map(item => item.soil ?? null), borderColor: '#4BC0C0', backgroundColor: 'rgba(75, 192, 192, 0.5)', yAxisID: 'y', tension: 0.1 },
      ],
    });
  };

  // --- WebSocket Handlers ---

  const handleSensorDataUpdate = (data) => {
    // Check if the update is for the currently selected garden
    if (data && selectedGarden && data.garden_id === selectedGarden._id) {
        console.log("Socket: Received sensor data update:", data);
        setSensorData(prevData => ({ ...prevData, ...data })); // Merge update with existing data
        setDataLoading(false); // Data is fresh
        // setLastUpdated(new Date()); // Handled by effect saving sensorData
    } else {
        console.log("Socket: Received sensor data for different/no garden:", data?.garden_id);
    }
  };

  const handleDeviceStatusUpdate = (data) => {
    // Check if the update is for the currently selected garden
     if (data && selectedGarden && data.garden_id === selectedGarden._id && data.device) {
        console.log("Socket: Received device status update:", data);
        const deviceKey = data.device.toLowerCase();
         // Ensure 'pump2' is handled correctly if backend sends 'PUMP_2'
         const mappedKey = deviceKey === 'pump_2' ? 'pump2' : deviceKey;

        if (mappedKey in deviceStates) { // Check if it's a known device key
             setDeviceStates(prevState => ({
               ...prevState,
               [mappedKey]: data.state,
             }));
             // Reset cooldown for this device if the update confirms the state change
             // (Optional: More robust check might compare expected vs actual state)
             if (cooldowns[data.device.toUpperCase()] > 0) { // Use original key for cooldowns map
                 console.log(`Resetting cooldown for ${data.device} due to socket update.`);
                 setCooldowns(prev => ({ ...prev, [data.device.toUpperCase()]: 0 }));
                 if (cooldownTimersRef.current[data.device.toUpperCase()]) {
                     clearInterval(cooldownTimersRef.current[data.device.toUpperCase()]);
                     cooldownTimersRef.current[data.device.toUpperCase()] = null;
                 }
             }
        } else {
            console.warn("Socket: Received update for unknown device key:", mappedKey);
        }

     } else {
         console.log("Socket: Received device status for different/no garden or invalid data:", data);
     }
  };

  // --- User Action Handlers ---

  const handleGardenChange = (event) => {
    const gardenId = event.target.value;
    const newSelectedGarden = gardens.find(garden => garden._id === gardenId);

    if (newSelectedGarden) {
      console.log(`User selected garden: ${newSelectedGarden.name} (${gardenId})`);
      setSelectedGarden(newSelectedGarden);
      localStorage.setItem('selectedGarden', gardenId); // Persist selection

      // Update mascot state based on the newly selected garden
      if (newSelectedGarden.is_connected) {
        setHappy();
      } else {
        setSad();
      }

      // Reset states and trigger data loading via the useEffect dependency change
      // No need to call fetch functions directly here, useEffect handles it
      setError(null); // Clear error from previous garden
    }
  };

  const handleDeviceControl = async (deviceKey, state) => {
    if (!selectedGarden?._id) {
        setError("Vui lòng chọn vườn trước khi điều khiển thiết bị.");
        return;
    }
    const gardenId = selectedGarden._id;

    // Check cooldown
    if (cooldowns[deviceKey] > 0) {
      setError(`Vui lòng đợi ${cooldowns[deviceKey]} giây để điều khiển ${titleMap[deviceKey] || deviceKey}.`);
      return;
    }
    setError(null); // Clear previous errors

    // Optimistic UI update (optional but improves perceived responsiveness)
    // setDeviceStates(prevState => ({ ...prevState, [deviceKey.toLowerCase()]: state }));

    try {
      console.log(`Sending control: Garden=${gardenId}, Device=${deviceKey}, State=${state}`);
      // Start cooldown immediately
      startCooldown(deviceKey);
      await deviceService.controlDevice(gardenId, deviceKey, state);
      console.log(`Control command for ${deviceKey} sent successfully.`);
      // If not doing optimistic update, update state after success confirmation:
       setDeviceStates(prevState => ({ ...prevState, [deviceKey.toLowerCase() === 'pump_2' ? 'pump2' : deviceKey.toLowerCase()]: state }));

      // No need to reset cooldown here, socket update should handle it if successful
      // If socket update doesn't arrive, cooldown will expire naturally

    } catch (err) {
      console.error(`Error controlling ${deviceKey}:`, err);
      setError(err.response?.data?.message || `Không thể điều khiển ${titleMap[deviceKey] || deviceKey}.`);

      // Revert optimistic update if it failed
      // setDeviceStates(prevState => ({ ...prevState, [deviceKey.toLowerCase()]: !state }));

      // Stop cooldown timer immediately on error
      clearCooldown(deviceKey);
    }
  };

  const titleMap = { FAN: 'Quạt', LIGHT: 'Đèn', PUMP: 'Máy bơm 1', PUMP_2: 'Máy bơm 2' };

  const startCooldown = (deviceKey) => {
    const COOLDOWN_DURATION = 20; // seconds
    setCooldowns(prev => ({ ...prev, [deviceKey]: COOLDOWN_DURATION }));

    if (cooldownTimersRef.current[deviceKey]) {
      clearInterval(cooldownTimersRef.current[deviceKey]);
    }

    cooldownTimersRef.current[deviceKey] = setInterval(() => {
      setCooldowns(prev => {
        const newTime = (prev[deviceKey] || 0) - 1;
        if (newTime <= 0) {
          clearInterval(cooldownTimersRef.current[deviceKey]);
          cooldownTimersRef.current[deviceKey] = null;
          return { ...prev, [deviceKey]: 0 };
        }
        return { ...prev, [deviceKey]: newTime };
      });
    }, 1000);
  };

   const clearCooldown = (deviceKey) => {
      if (cooldownTimersRef.current[deviceKey]) {
          clearInterval(cooldownTimersRef.current[deviceKey]);
          cooldownTimersRef.current[deviceKey] = null;
      }
      setCooldowns(prev => ({ ...prev, [deviceKey]: 0 }));
  };


  const handleAutoModeToggle = async () => {
    if (!selectedGarden?._id) return;
    const gardenId = selectedGarden._id;
    const newState = !deviceStates.auto;

    // Optimistic UI update
    setDeviceStates(prevState => ({ ...prevState, auto: newState }));
    setError(null);

    try {
      console.log(`Setting auto mode to ${newState} for garden ${gardenId}`);
      await deviceService.setAutoMode(gardenId, newState);
      console.log("Auto mode updated successfully.");
      // State already updated optimistically
    } catch (err) {
      console.error('Error toggling auto mode:', err);
      setError(err.response?.data?.message || 'Không thể thay đổi chế độ tự động.');
      // Revert optimistic update on error
      setDeviceStates(prevState => ({ ...prevState, auto: !newState }));
    }
  };

  const handleRefresh = () => {
    if (selectedGarden?._id) {
        console.log("Manual refresh requested.");
        setError(null); // Clear errors on refresh
        setLoading(true); // Indicate loading starts
        setDataLoading(true);
        setLoadingAnalysis(true);
        loadData(selectedGarden._id);
        fetchLatestAnalysis(selectedGarden._id);
    } else {
        setError("Vui lòng chọn một vườn để làm mới.");
    }
  };

  const fetchLatestAnalysis = async (gardenId) => {
    if (!gardenId) return;

    console.log(`Fetching latest analysis for garden: ${gardenId}`);
    setLoadingAnalysis(true);
    // setAnalysisData(null); // Clear old data before fetch? Maybe keep stale data until new arrives.

    try {
      // Try history first as it might be more detailed or the intended source
      const historyResponse = await analysisService.getAnalysisHistory(gardenId, { limit: 1, sort: '-timestamp' }); // Get only the latest
      console.log("Analysis history response:", historyResponse);

      if (historyResponse.success && historyResponse.data?.length > 0) {
        console.log("Found analysis in history:", historyResponse.data[0]);
        setAnalysisData(historyResponse.data[0]);
        // localStorage.setItem(`analysis_${gardenId}`, JSON.stringify(historyResponse.data[0])); // Saved by effect
        return; // Exit if found in history
      }

      // If not in history, try the 'latest' endpoint
      console.log("No recent analysis in history, trying latest analysis endpoint...");
      const latestResponse = await analysisService.getLatestAnalysis(gardenId);
      console.log("Latest analysis response:", latestResponse);

      if (latestResponse.success && latestResponse.analysis) {
         console.log("Found analysis via latest endpoint:", latestResponse.analysis);
        setAnalysisData(latestResponse.analysis);
        // localStorage.setItem(`analysis_${gardenId}`, JSON.stringify(latestResponse.analysis)); // Saved by effect
      } else {
        console.log("No analysis found from API endpoints.");
        // Check localStorage as a last resort (already loaded in initial useEffect, but good fallback)
        const savedAnalysis = localStorage.getItem(`analysis_${gardenId}`);
        if (savedAnalysis && !analysisData) { // Only set if current state is null
            try {
                const parsed = JSON.parse(savedAnalysis);
                console.log("Using analysis from localStorage as fallback:", parsed);
                setAnalysisData(parsed);
            } catch (e) {
                console.error("Error parsing analysis from localStorage fallback", e);
                setAnalysisData(null); // Clear if parsing fails
                localStorage.removeItem(`analysis_${gardenId}`);
            }
        } else if (!analysisData) { // Ensure it's null if nothing found
            setAnalysisData(null);
        }
      }

    } catch (error) {
      console.error("Error fetching analysis data:", error);
       if (error.response) {
            console.error("Analysis API Error Response:", error.response.status, error.response.data);
        }
       // Don't set a general error message here, let the UI handle 'no analysis data' state
      // setError("Không thể tải dữ liệu phân tích."); // Avoid overwriting other errors
      // Attempt to load from local storage on error, only if analysisData is currently null
        if (!analysisData) {
            const savedAnalysis = localStorage.getItem(`analysis_${gardenId}`);
            if (savedAnalysis) {
                try {
                    const parsed = JSON.parse(savedAnalysis);
                    console.log("Using analysis from localStorage after fetch error:", parsed);
                    setAnalysisData(parsed);
                } catch (e) {
                     console.error("Error parsing analysis from localStorage after error", e);
                     setAnalysisData(null);
                     localStorage.removeItem(`analysis_${gardenId}`);
                }
            } else {
                 setAnalysisData(null); // Ensure null if nothing found after error
            }
        }
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // --- Render Logic ---

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
          {gardensError} {/* Use specific gardens error */}
        </Alert>
      </MainLayout>
    );
  }

  if (!gardensLoading && gardens.length === 0) {
    return (
      <MainLayout>
        <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', mt: 4, px: 2 }}>
          <Alert severity="info" sx={{ mb: 4, /* Dark mode styles */ }}>
            Bạn chưa có vườn nào. Hãy tạo vườn mới để bắt đầu!
          </Alert>
          <Button variant="contained" color="primary" onClick={() => navigate('/gardens/new')} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Tạo vườn mới
          </Button>
        </Box>
      </MainLayout>
    );
  }

  // Main dashboard render
  return (
    <MainLayout>
      <Container 
        maxWidth="xl" 
        disableGutters={isMobile} 
        sx={{ 
          px: { xs: 1, sm: 2, md: 3 },
          mt: { xs: -1, sm: 0 }
        }}
      >
        {/* Welcome Card */}
        <WelcomeCard
          selectedGarden={selectedGarden}
          gardens={gardens}
          loading={loading}
          handleGardenChange={handleGardenChange}
          handleRefresh={handleRefresh}
          sensorData={sensorData}
          analysisData={analysisData}
          loadingAnalysis={loadingAnalysis}
        />

        {/* Global Error Display */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: { xs: '12px', sm: '16px' },
              fontSize: { xs: '0.85rem', sm: 'inherit' }
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Conditional Rendering based on selected garden */}
        {!selectedGarden && !loading ? (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 3,
              borderRadius: { xs: '12px', sm: '16px' },
              fontSize: { xs: '0.85rem', sm: 'inherit' }
            }}
          >
            Vui lòng chọn một vườn từ danh sách trên.
          </Alert>
        ) : loading && !sensorData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30vh' }}>
            <CircularProgress />
            <Typography sx={{ml: 2, fontSize: { xs: '0.9rem', sm: '1rem' }}}>Đang tải dữ liệu vườn...</Typography>
          </Box>
        ) : selectedGarden ? (
          <>
            {/* Sensor Data Section */}
            <Typography
              variant={isMobile ? "body1" : "h5"} 
              gutterBottom
              sx={{ 
                mt: { xs: 2.5, sm: 4 }, 
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                fontWeight: { xs: 600, sm: 500 },
                pl: { xs: 0.5, sm: 0 }
              }}
            >
              Dữ liệu cảm biến
            </Typography>
            <Divider sx={{ 
              mb: { xs: 1.5, sm: 2 }, 
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : undefined 
            }} />
            <Grid 
              container 
              spacing={{ xs: 1.5, sm: 2, md: 3 }}
              sx={{ mb: { xs: 1, sm: 0 } }}
            >
              <SensorDataDisplay title="Nhiệt độ" value={sensorData?.temperature} unit="°C" icon={<Thermostat color="error" />} isLoading={dataLoading && !sensorData} />
              <SensorDataDisplay title="Độ ẩm KK" value={sensorData?.humidity} unit="%" icon={<Opacity color="primary" />} isLoading={dataLoading && !sensorData} />
              <SensorDataDisplay title="Ánh sáng" value={sensorData?.light} unit="%" icon={<WbSunny color="warning" />} isLoading={dataLoading && !sensorData} />
              <SensorDataDisplay title="Độ ẩm đất" value={sensorData?.soil} unit="%" icon={<GrassOutlined color="success" />} isLoading={dataLoading && !sensorData} />
            </Grid>

            {/* Device Control Section */}
            <Typography
              variant={isMobile ? "body1" : "h5"} 
              gutterBottom
              sx={{ 
                mt: { xs: 2.5, sm: 4 }, 
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                fontWeight: { xs: 600, sm: 500 },
                pl: { xs: 0.5, sm: 0 }
              }}
            >
              Điều khiển thiết bị
            </Typography>
            <Divider sx={{ 
              mb: { xs: 1.5, sm: 2 },
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : undefined 
            }} />
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={deviceStates.auto} 
                    onChange={handleAutoModeToggle} 
                    color="primary" 
                    size={isMobile ? "small" : "medium"}
                  />
                }
                label={ 
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 'bold', 
                      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'inherit',
                      fontSize: { xs: '0.85rem', sm: '1rem' }
                    }}
                  > 
                    Chế độ tự động 
                  </Typography> 
                }
              />
              {deviceStates.auto && (
                <Alert 
                  severity="info" 
                  sx={{ 
                    mt: 1,
                    borderRadius: '12px',
                    fontSize: { xs: '0.8rem', sm: '0.9rem' }
                  }}
                >
                  Chế độ tự động đang bật. Thiết bị sẽ tự điều chỉnh.
                </Alert>
              )}
            </Box>
            <Grid 
              container 
              spacing={{ xs: 1.5, sm: 2, md: 3 }}
              sx={{ mb: { xs: 1, sm: 0 } }}
            >
              <DeviceControlCard title="Quạt" deviceKey="FAN" icon={<AirOutlined />} isOn={deviceStates.fan} isAutoMode={deviceStates.auto} cooldown={cooldowns.FAN} onControl={handleDeviceControl} />
              <DeviceControlCard title="Đèn" deviceKey="LIGHT" icon={<WbSunny />} isOn={deviceStates.light} isAutoMode={deviceStates.auto} cooldown={cooldowns.LIGHT} onControl={handleDeviceControl} />
              <DeviceControlCard title="Máy bơm 1" deviceKey="PUMP" icon={<WaterDrop />} isOn={deviceStates.pump} isAutoMode={deviceStates.auto} cooldown={cooldowns.PUMP} onControl={handleDeviceControl} />
              <DeviceControlCard title="Máy bơm 2" deviceKey="PUMP_2" icon={<Grass />} isOn={deviceStates.pump2} isAutoMode={deviceStates.auto} cooldown={cooldowns.PUMP_2} onControl={handleDeviceControl} />
            </Grid>

            {/* Chart Section */}
            <ChartDisplay chartData={chartData} />
            {/* Optionally show a message if chartData is null after loading */}
            {!chartData && !dataLoading && selectedGarden && (
              <Typography 
                sx={{ 
                  mt: 2, 
                  textAlign: 'center', 
                  color: 'text.secondary',
                  fontSize: { xs: '0.85rem', sm: '1rem' }
                }}
              >
                Không có dữ liệu lịch sử để hiển thị biểu đồ.
              </Typography>
            )}
          </>
        ) : null /* End of selectedGarden check */}
      </Container>
    </MainLayout>
  );
};

export default Dashboard;

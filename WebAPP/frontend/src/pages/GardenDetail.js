// src/pages/GardenDetail.js (or wherever it is)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useColorMode } from '../App'; // Import useColorMode
import MainLayout from '../components/Layout/MainLayout';
import ConnectionStatus from '../components/ConnectionStatus';
import { sensorService, deviceService, imageService, analysisService, scheduleService } from '../services';
import {
  Box, Container, Typography, Paper, Button, Tabs, Tab, CircularProgress, Alert,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon, // Keep if used for future settings tab
  PhotoCamera as PhotoCameraIcon,
  Dashboard as DashboardIcon, // Renamed from Overview icon if needed
  Build as BuildIcon, // Example icon for Control tab
} from '@mui/icons-material';

// Import the new tab components
import GardenOverviewTab from '../components/GardenDetail/GardenOverviewTab';
import GardenControlTab from '../components/GardenDetail/GardenControlTab';
import GardenScheduleTab from '../components/GardenDetail/GardenScheduleTab';
import GardenCameraTab from '../components/GardenDetail/GardenCameraTab';
import GardenAnalysisTab from '../components/GardenDetail/GardenAnalysisTab';

// Import CSS
import '../styles/GardenDetail.css';

// Shared Styles - Keep or move to theme/css
const tabStyle = {
  '& .MuiTab-root': { 
     fontWeight: 'medium', 
     fontSize: '0.95rem', 
     textTransform: 'none', 
     minHeight: '48px',
     opacity: 0.7,
     transition: 'all 0.3s ease'
  },
  '& .Mui-selected': { 
     fontWeight: 'bold', 
     color: 'primary.main',
     opacity: 1
  },
  '& .MuiTabs-indicator': { 
     backgroundColor: 'primary.main', 
     height: 3, 
     borderRadius: '3px 3px 0 0' 
  }
};


const GardenDetail = () => {
  const { gardenId } = useParams();
  const navigate = useNavigate();
  const { getGardenById } = useGarden();
  const { joinGardenRoom, subscribe, unsubscribe, socket } = useSocket(); // Include socket
  const { toast } = useToast();
  const { mode } = useColorMode(); // Get current color mode

  // --- State Declarations ---
  const [garden, setGarden] = useState(null); // Initialize as null
  const [sensorData, setSensorData] = useState(null);
  const [deviceStates, setDeviceStates] = useState({ fan: false, light: false, pump: false, pump2: false, auto: false });
  const [deviceLoading, setDeviceLoading] = useState({ fan: false, light: false, pump: false, pump2: false, auto: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [latestImage, setLatestImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [applyingSuggestions, setApplyingSuggestions] = useState(false); // Moved from AnalysisTab
  const [isOffline, setIsOffline] = useState(true);
  const [isCameraOffline, setIsCameraOffline] = useState(true);
  const [lastConnectedDate, setLastConnectedDate] = useState(null);
  const [lastCameraConnected, setLastCameraConnected] = useState(null);
  const [createdDate, setCreatedDate] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamImage, setStreamImage] = useState(null);
  // Schedule state now managed within GardenScheduleTab

  // --- Effects ---

  // Fetch Initial Garden Data
  const loadGardenData = useCallback(async () => {
    if (!gardenId) return;
    setLoading(true);
    setError(null);
    try {
      const gardenDataResponse = await getGardenById(gardenId);
      if (gardenDataResponse && gardenDataResponse.garden) {
        const fetchedGarden = gardenDataResponse.garden;
        setGarden(fetchedGarden);
        setSensorData(fetchedGarden.sensor_data);
        setIsOffline(!fetchedGarden.is_connected);
        setIsCameraOffline(!fetchedGarden.camera_is_connected && fetchedGarden.has_camera);
        setLastConnectedDate(fetchedGarden.last_connected ? new Date(fetchedGarden.last_connected) : null);
        setLastCameraConnected(fetchedGarden.camera_last_connected ? new Date(fetchedGarden.camera_last_connected) : null);
        setCreatedDate(fetchedGarden.created_at ? new Date(fetchedGarden.created_at) : null);

        // Initialize device states from garden data
        const newDeviceStates = { fan: false, light: false, pump: false, pump2: false, auto: false };
        fetchedGarden.devices?.forEach(device => {
            const key = device.device_id?.toLowerCase();
            if (key === 'auto') newDeviceStates.auto = !!device.status;
            else if (key === 'fan') newDeviceStates.fan = !!device.status;
            else if (key === 'light') newDeviceStates.light = !!device.status;
            else if (key === 'pump') newDeviceStates.pump = !!device.status;
            else if (key === 'pump_2' || key === 'pump2') newDeviceStates.pump2 = !!device.status; // Handle both variations
        });
        setDeviceStates(newDeviceStates);

         // Load latest image if camera exists
         if (fetchedGarden.has_camera) {
             loadLatestImage();
         }
         // Load latest analysis
         loadLatestAnalysis();

      } else {
        throw new Error("Không tìm thấy dữ liệu vườn.");
      }
    } catch (err) {
      console.error('Error loading garden data:', err);
      setError('Không thể tải dữ liệu vườn.');
      setGarden(null); // Ensure garden is null on error
    } finally {
      setLoading(false);
    }
  }, [gardenId, getGardenById]); // Add dependencies

   const loadLatestImage = useCallback(async () => {
       if (!gardenId || !garden?.has_camera) return;
       try {
          const images = await imageService.getGardenImages(gardenId);
          if (images && images.length > 0) {
             setLatestImage(images[0]);
          } else {
             setLatestImage(null);
          }
       } catch (error) {
          console.error("Error loading latest image:", error);
          // Don't toast here, it's a background load
       }
    }, [gardenId, garden?.has_camera]); // Dependency on garden having camera

   const loadLatestAnalysis = useCallback(async () => {
       if (!gardenId) return;
       try {
          const response = await analysisService.getLatestAnalysis(gardenId);
          if (response.success && response.analysis) {
             setAnalysis(response.analysis);
          } else {
             setAnalysis(null); // Clear analysis if fetch fails or no analysis found
          }
       } catch (err) {
          console.error('Error loading latest analysis:', err);
          setAnalysis(null); // Clear analysis on error
       }
    }, [gardenId]); // Dependency


  // Socket Event Handlers
  const handleSensorDataUpdate = useCallback((data) => {
    setSensorData(data);
  }, []);

  const handleDeviceStatusUpdate = useCallback((data) => {
    console.log("Socket device update:", data);
    const deviceKey = data?.device?.toLowerCase();
    if (deviceKey && deviceKey in deviceStates) { // Check if key exists
        setDeviceStates(prevState => ({
          ...prevState,
          [deviceKey]: data.state // Assuming data.state is the boolean status
        }));
        // Turn off loading indicator for the specific device after update received
        setDeviceLoading(prevLoading => ({
            ...prevLoading,
            [deviceKey]: false
        }));
    } else {
        console.warn("Received update for unknown device:", deviceKey);
    }
  }, [deviceStates]); // Add deviceStates dependency

  const handleConnectionStatus = useCallback((data) => {
    console.log('Socket device connection:', data);
    const isConnected = data.connected === true;
    setIsOffline(!isConnected);
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date(); // Fallback to now
    setLastConnectedDate(timestamp); // Always update last activity time
    if (isConnected) {
        toast.success(data.message || 'Thiết bị đã kết nối.');
    } else {
        toast.warning(data.message || 'Thiết bị đã ngắt kết nối.');
    }
    // Update garden state minimally if needed
    setGarden(prev => prev ? ({...prev, is_connected: isConnected, last_connected: timestamp }) : null);
  }, [toast]);

   const handleCameraConnectionStatus = useCallback((data) => {
       console.log('Socket camera connection:', data);
       const isConnected = data.connected === true;
       setIsCameraOffline(!isConnected);
       const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
       setLastCameraConnected(timestamp);
       if (isConnected) {
           toast.success(data.message || 'Camera đã kết nối.');
       } else {
           toast.warning(data.message || 'Camera đã ngắt kết nối.');
            setIsStreaming(false); // Stop streaming UI if camera disconnects
            setStreamImage(null);
       }
        setGarden(prev => prev ? ({...prev, camera_is_connected: isConnected, camera_last_connected: timestamp }) : null);
   }, [toast]);

   const handleStreamData = useCallback((data) => {
       // console.log('Received stream frame'); // Reduce console noise
       if (!data || !data.data) return;
       try {
           const blob = new Blob([data.data], { type: 'image/jpeg' });
           const reader = new FileReader();
           reader.onload = () => setStreamImage(reader.result);
           reader.onerror = (error) => console.error('Error reading stream frame:', error);
           reader.readAsDataURL(blob);
       } catch (error) {
           console.error('Error processing stream data:', error);
       }
   }, []);


  // Socket Connection Effect
  useEffect(() => {
    if (gardenId && socket) { // Ensure socket is available
      joinGardenRoom(gardenId);
      subscribe('sensor_data_update', handleSensorDataUpdate);
      subscribe('device_status_update', handleDeviceStatusUpdate);
      subscribe('device_connection_status', handleConnectionStatus);
      subscribe('camera_connection_status', handleCameraConnectionStatus);
      socket.on('stream_frame', handleStreamData); // Use direct socket instance

      // Initial load
      loadGardenData();

      // Refresh interval (optional, sockets should handle most updates)
      const interval = setInterval(loadGardenData, 60000); // Longer interval

      return () => {
        unsubscribe('sensor_data_update', handleSensorDataUpdate);
        unsubscribe('device_status_update', handleDeviceStatusUpdate);
        unsubscribe('device_connection_status', handleConnectionStatus);
        unsubscribe('camera_connection_status', handleCameraConnectionStatus);
        socket.off('stream_frame', handleStreamData); // Use direct socket instance
        clearInterval(interval);
        // Optionally leave the room: leaveGardenRoom(gardenId);
      };
    }
  }, [
      gardenId, socket, // Add socket dependency
      joinGardenRoom, subscribe, unsubscribe,
      handleSensorDataUpdate, handleDeviceStatusUpdate, handleConnectionStatus,
      handleCameraConnectionStatus, handleStreamData, loadGardenData // Include loadGardenData
   ]); // Dependencies


  // --- Handlers ---
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDeviceControl = async (deviceInfo, state) => {
    const deviceId = deviceInfo.device_id; // e.g., "FAN", "PUMP_2"
    const deviceKey = deviceId.toLowerCase(); // e.g., "fan", "pump_2"

    // Check if the key exists in our state management
    if (!(deviceKey in deviceLoading)) {
        console.error(`Control attempted for unmanaged device key: ${deviceKey}`);
        toast.error(`Thiết bị không được hỗ trợ: ${deviceId}`);
        return;
    }

    setDeviceLoading(prevState => ({ ...prevState, [deviceKey]: true }));

    try {
        await deviceService.controlDevice(gardenId, deviceId, state);
        // Don't immediately change state here; wait for socket update (handleDeviceStatusUpdate)
        toast.info(`Đã gửi lệnh ${state ? 'BẬT' : 'TẮT'} tới ${deviceId}.`);
         // Set a timeout to turn off loading if no socket update is received
         setTimeout(() => {
            setDeviceLoading(prevState => ({ ...prevState, [deviceKey]: false }));
         }, 15000); // 15 seconds timeout

    } catch (err) {
        console.error(`Error controlling ${deviceId}:`, err);
        toast.error(`Lỗi điều khiển ${deviceId}: ${err.message}`);
        setDeviceLoading(prevState => ({ ...prevState, [deviceKey]: false })); // Turn off loading on error
    }
  };


   const handleAutoModeToggle = async () => {
       const newState = !deviceStates.auto;
       setDeviceLoading(prevState => ({ ...prevState, auto: true }));
       try {
           await deviceService.setAutoMode(gardenId, newState);
           // Wait for socket update ('device_status_update' with device 'AUTO')
           toast.info(`Đã gửi lệnh ${newState ? 'BẬT' : 'TẮT'} chế độ tự động.`);
            // Timeout for loading state
           setTimeout(() => {
               setDeviceLoading(prevState => ({ ...prevState, auto: false }));
           }, 15000);
       } catch (err) {
           console.error('Error toggling auto mode:', err);
           toast.error(`Lỗi chuyển chế độ tự động: ${err.message}`);
           setDeviceLoading(prevState => ({ ...prevState, auto: false }));
       }
   };

  const handleCaptureImage = async () => {
    if (!garden?.camera_serial) {
        toast.error("Không tìm thấy mã camera.");
        return;
    }
    setCaptureLoading(true);
    try {
      await deviceService.captureImage(garden.camera_serial);
      toast.success('Đã gửi yêu cầu chụp ảnh.');
      // Set a timeout to fetch the latest image after a delay
      setTimeout(loadLatestImage, 7000); // Increased delay
    } catch (error) {
      console.error('Error capturing image:', error);
      toast.error('Lỗi chụp ảnh: ' + error.message);
    } finally {
      // Let loadLatestImage handle turning off captureLoading indirectly
      // Or add a separate timeout for captureLoading if needed
       setTimeout(() => setCaptureLoading(false), 7000);
    }
  };

   const toggleStream = async () => {
        if (!garden?.camera_serial) {
            toast.error("Không tìm thấy mã camera.");
            return;
        }
        const action = !isStreaming; // The action we want to perform
        try {
            await deviceService.controlStream(garden.camera_serial, action);
            setIsStreaming(action);
            toast.info(action ? 'Bắt đầu stream...' : 'Dừng stream.');
            if (!action) {
                setStreamImage(null); // Clear image when stopping
            }
        } catch (error) {
            console.error('Error toggling stream:', error);
            toast.error('Lỗi điều khiển stream: ' + error.message);
            // Revert UI state on error
            setIsStreaming(!action);
        }
    };

   const handleAnalyzeGarden = async () => {
       setAnalysisLoading(true);
       setAnalysis(null); // Clear previous analysis
       try {
           const response = await analysisService.analyzeGarden(gardenId);
           if (response.success && (response.analysis || response.data)) {
              const newAnalysis = response.analysis || { result: response.data, timestamp: new Date() };
              setAnalysis(newAnalysis);
              toast.success('Phân tích vườn thành công!');
               // Optionally switch to the analysis tab
               setTabValue(getAnalysisTabIndex());
           } else {
               toast.error(response.message || 'Phân tích vườn thất bại.');
               setAnalysis(null);
           }
       } catch (error) {
           console.error('Error analyzing garden:', error);
           toast.error('Lỗi phân tích vườn: ' + error.message);
           setAnalysis(null);
       } finally {
           setAnalysisLoading(false);
       }
   };

   // Function to apply suggestions (passed to AnalysisTab)
    const handleApplySuggestions = async (deviceRecommendations) => {
        if (!deviceRecommendations || deviceRecommendations.length === 0) {
            toast.info("Không có đề xuất thiết bị nào để áp dụng.");
            return;
        }
        setApplyingSuggestions(true);
        try {
            // Format suggestions (ensure correct device names like PUMP_2)
            const formattedSuggestions = deviceRecommendations.map(suggestion => ({
                ...suggestion,
                device: suggestion.device === 'PUMP2' ? 'PUMP_2' : suggestion.device,
            }));

            await analysisService.applySuggestions(gardenId, formattedSuggestions);
            toast.success('Đã áp dụng đề xuất thành công! Lịch trình đã được cập nhật.');

            // Refresh data - schedules are handled by GardenScheduleTab's internal load
            // We might need to trigger a refresh there if it doesn't listen for external changes
            // For simplicity here, let's rely on potential socket updates or manual refresh
            // Or, ideally, pass a refresh callback to GardenScheduleTab.
            // Let's just reload garden data for now
            loadGardenData();
            // Manually trigger schedule reload (if ScheduleTab doesn't auto-reload)
            // This requires getting a ref or callback from ScheduleTab, complex setup.
            // Best approach: GardenScheduleTab reloads itself via useEffect on gardenId.

        } catch (error) {
            console.error('Error applying suggestions:', error);
            toast.error('Lỗi áp dụng đề xuất: ' + (error.response?.data?.message || error.message));
        } finally {
            setApplyingSuggestions(false);
        }
    };

   // Function to get the correct index for the analysis tab
   const getAnalysisTabIndex = () => (garden?.has_camera ? 4 : 3);
   // Function to get the correct index for the camera tab
   const getCameraTabIndex = () => (garden?.has_camera ? 3 : -1);


  // --- Render Logic ---
  if (loading && !garden) { // Show loading only on initial load
    return <MainLayout><Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box></MainLayout>;
  }

  if (error && !garden) { // Show fatal error if garden couldn't load at all
    return <MainLayout><Container maxWidth="xl"><Alert severity="error" sx={{ mt: 2 }}>{error}</Alert></Container></MainLayout>;
  }

  if (!garden) { // Handle case where loading finished but garden is still null (shouldn't happen if error handling is correct)
     return <MainLayout><Container maxWidth="xl"><Alert severity="warning" sx={{ mt: 2 }}>Không thể tải thông tin vườn.</Alert></Container></MainLayout>;
  }

  return (
    <MainLayout>
      <Container maxWidth="xl" className="garden-detail" data-theme={mode}>
        {/* Non-fatal errors (e.g., schedule load error) can be shown inside tabs */}
        {/* Offline Alert */}
        {isOffline && (
          <Alert severity="warning" sx={{ 
            mb: 2, 
            borderRadius: '12px',
            animation: 'pulse 2s infinite ease-in-out',
            boxShadow: 'var(--card-shadow)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ConnectionStatus isConnected={false} lastConnected={lastConnectedDate} size="small" variant="dot" showText={false} />
                <Box sx={{ ml: 1 }}>
                    <strong>Thiết bị đang offline.</strong> {lastConnectedDate ? ` Lần cuối: ${lastConnectedDate.toLocaleString('vi-VN')}` : ''}
                </Box>
            </Box>
          </Alert>
        )}

        {/* Main Content Area */}
        <Box sx={{ opacity: isOffline ? 0.8 : 1, transition: 'opacity 0.3s' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              className="garden-tabs"
              sx={tabStyle} // Apply shared style
            >
              <Tab 
                className="garden-tab" 
                label="Tổng quan" 
                icon={<DashboardIcon className="garden-tab-icon" />} 
                iconPosition="start"
              />
              <Tab 
                className="garden-tab" 
                label="Điều khiển" 
                icon={<BuildIcon className="garden-tab-icon" />} 
                iconPosition="start"
              />
              <Tab 
                className="garden-tab" 
                label="Lịch trình" 
                icon={<ScheduleIcon className="garden-tab-icon" />} 
                iconPosition="start" 
              />
              {garden.has_camera && 
                <Tab 
                  className="garden-tab" 
                  label="Camera" 
                  icon={<PhotoCameraIcon className="garden-tab-icon" />} 
                  iconPosition="start"
                />
              }
              <Tab 
                className="garden-tab" 
                label="Phân tích" 
                icon={<BarChartIcon className="garden-tab-icon" />} 
                iconPosition="start"
              />
              {/* <Tab label="Cài đặt" icon={<SettingsIcon />} iconPosition="start"/> */}
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <div role="tabpanel" hidden={tabValue !== 0}>
            {tabValue === 0 && (
              <GardenOverviewTab
                garden={garden}
                sensorData={sensorData}
                isOffline={isOffline}
                lastConnectedDate={lastConnectedDate}
                createdDate={createdDate}
              />
            )}
          </div>

          <div role="tabpanel" hidden={tabValue !== 1}>
            {tabValue === 1 && (
              <GardenControlTab
                deviceStates={deviceStates}
                deviceLoading={deviceLoading}
                handleDeviceControl={handleDeviceControl}
                handleAutoModeToggle={handleAutoModeToggle}
              />
            )}
          </div>

          <div role="tabpanel" hidden={tabValue !== 2}>
            {tabValue === 2 && (
               // GardenScheduleTab manages its own data fetching
               <GardenScheduleTab gardenId={gardenId} />
            )}
          </div>

          {/* Camera Tab Panel (conditional) */}
          {garden.has_camera && (
            <div role="tabpanel" hidden={tabValue !== getCameraTabIndex()}>
                {tabValue === getCameraTabIndex() && (
                  <GardenCameraTab
                    garden={garden}
                    isCameraOffline={isCameraOffline}
                    lastCameraConnected={lastCameraConnected}
                    captureLoading={captureLoading}
                    handleCaptureImage={handleCaptureImage}
                    isStreaming={isStreaming}
                    toggleStream={toggleStream}
                    streamImage={streamImage}
                    latestImage={latestImage}
                    analysisLoading={analysisLoading} // Pass loading state for analyze button
                    setTabValue={setTabValue} // Pass function to switch tabs
                    getAnalysisTabIndex={getAnalysisTabIndex} // Pass helper to get index
                  />
                )}
            </div>
          )}


          {/* Analysis Tab Panel */}
           <div role="tabpanel" hidden={tabValue !== getAnalysisTabIndex()}>
               {tabValue === getAnalysisTabIndex() && (
                  <GardenAnalysisTab
                     gardenId={gardenId}
                     analysis={analysis}
                     analysisLoading={analysisLoading}
                     handleAnalyzeGarden={handleAnalyzeGarden}
                     applyingSuggestions={applyingSuggestions}
                     handleApplySuggestions={handleApplySuggestions} // Pass the actual handler
                  />
               )}
            </div>


          {/* Settings Tab Panel Placeholder */}
          {/* <div role="tabpanel" hidden={tabValue !== (garden.has_camera ? 5 : 4)}>
            {tabValue === (garden.has_camera ? 5 : 4) && (
               <Typography>Cài đặt vườn sẽ được triển khai.</Typography>
            )}
          </div> */}
        </Box>
      </Container>
    </MainLayout>
  );
};

export default GardenDetail;
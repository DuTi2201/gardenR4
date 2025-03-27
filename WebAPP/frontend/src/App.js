import React, { createContext, useState, useMemo, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { GardenProvider } from './context/GardenContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './context/AuthContext';
import { MascotProvider } from './components/Mascot/MascotContext';
import MascotContainer from './components/Mascot/MascotContainer';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GardenList from './pages/GardenList';
import GardenDetail from './pages/GardenDetail';
import GardenForm from './pages/GardenForm';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import DeviceSerials from './pages/admin/DeviceSerials';
import UserManagement from './pages/admin/UserManagement';
import UserDetail from './pages/admin/UserDetail';
import AdminGardens from './pages/admin/Gardens';

// Tạo ColorModeContext để quản lý chế độ màu sáng/tối
export const ColorModeContext = createContext({ 
  toggleColorMode: () => {},
  mode: 'light'
});

// Custom hook để sử dụng ColorMode
export const useColorMode = () => useContext(ColorModeContext);

// Tạo theme cho MUI
const getTheme = (mode) => createTheme({
  palette: {
    mode,
    ...(mode === 'light' 
      ? {
          // Light mode
          primary: {
            main: '#4CAF50', // Xanh lá đậm phù hợp với linh vật
            light: '#80E27E', // Xanh lá nhạt
            dark: '#087f23', // Xanh lá sẫm
            contrastText: '#fff',
          },
          secondary: {
            main: '#A5D6A7', // Màu kem/be nhạt phù hợp với trang phục linh vật
            light: '#D7FFD9',
            dark: '#75A478',
            contrastText: '#333',
          },
          background: {
            default: '#f8f9fa', // Nền trắng kem nhẹ
            paper: '#ffffff',
          },
          success: {
            main: '#4CAF50',
            light: '#81C784',
            dark: '#388E3C',
          },
          error: {
            main: '#F44336',
            light: '#E57373',
            dark: '#D32F2F',
          },
          warning: {
            main: '#FFA726',
            light: '#FFB74D',
            dark: '#F57C00',
          },
          info: {
            main: '#29B6F6',
            light: '#4FC3F7',
            dark: '#0288D1',
          },
          text: {
            primary: '#263238',
            secondary: '#546E7A',
            disabled: '#90A4AE',
          },
        }
      : {
          // Dark mode - cập nhật theo yêu cầu
          primary: {
            main: '#67ad5b', // Xanh lá tươi cho nút bấm và điểm nhấn chính
            light: '#80E27E',
            dark: '#314941', // Xanh lá đậm hơn cho hover
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#f6c444', // Điểm nhấn phụ
            light: '#ffdb76',
            dark: '#d4a520',
            contrastText: '#000000',
          },
          background: {
            default: '#151a1f', // Nền tối theo yêu cầu
            paper: '#242f3e', // Màu nền card theo yêu cầu
          },
          success: {
            main: '#67ad5b',
            light: '#81C784',
            dark: '#314941',
          },
          error: {
            main: '#F44336',
            light: '#E57373',
            dark: '#D32F2F',
          },
          warning: {
            main: '#f6c444',
            light: '#ffdb76',
            dark: '#d4a520',
          },
          info: {
            main: '#3f454f', // Màu phụ trợ
            light: '#5c6271',
            dark: '#2b3038',
          },
          text: {
            primary: '#ffffff', // Chữ trắng nổi bật
            secondary: '#d0d0d0', // Chữ phụ màu xám nhạt
            disabled: '#6C7A89',
          },
        }),
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 500,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 500,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 12, // Góc bo tròn hiện đại
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.15), 0px 1px 1px 0px rgba(0,0,0,0.06), 0px 1px 3px 0px rgba(0,0,0,0.05)',
    // ... giữ các shadows mặc định khác
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
        containedPrimary: {
          boxShadow: '0 4px 10px rgba(76, 175, 80, 0.25)',
          '&:hover': {
            backgroundColor: '#314941', // Màu nút hover theo yêu cầu
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          boxShadow: theme.palette.mode === 'dark' 
            ? '0px 5px 15px rgba(0, 0, 0, 0.2)' 
            : '0px 5px 15px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          backgroundColor: theme.palette.mode === 'dark' ? '#242f3e' : '#ffffff',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark' ? '#242f3e' : '#ffffff',
        }),
        rounded: {
          borderRadius: 12,
        },
        elevation1: ({ theme }) => ({
          boxShadow: theme.palette.mode === 'dark'
            ? '0px 5px 15px rgba(0, 0, 0, 0.2)'
            : '0px 5px 15px rgba(0, 0, 0, 0.05)',
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark' ? '#242f3e' : '#ffffff',
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark' ? '#242f3e' : '#ffffff',
        }),
      },
    },
  },
});

// Route được bảo vệ, chỉ cho phép người dùng đã đăng nhập
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Đang tải...</div>;
  }

  console.log('ProtectedRoute check:', {
    currentUser,
    requireAdmin,
    isAdmin: currentUser?.role === 'admin'
  });

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra quyền admin nếu cần
  if (requireAdmin && currentUser.role !== 'admin') {
    console.log('Access denied - not an admin');
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  // Thêm state để quản lý chế độ màu sáng/tối 
  const [mode, setMode] = useState(() => {
    // Đọc giá trị từ localStorage nếu có, nếu không thì mặc định là light
    const savedMode = localStorage.getItem('color-mode');
    return savedMode || 'light';
  });

  // Context value cho ColorModeContext
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('color-mode', newMode); // Lưu vào localStorage
          return newMode;
        });
      },
      mode
    }),
    [mode],
  );

  // Theme dựa trên giá trị mode hiện tại
  const theme = useMemo(() => getTheme(mode), [mode]);

  console.log('App rendering, current pathname:', window.location.pathname);
  console.log('Current theme mode:', mode);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          <Router>
            <AuthProvider>
              <MascotProvider>
                <Routes>
                  {/* Public routes - không cần GardenProvider và SocketProvider */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="*" element={<NotFound />} />

                  {/* Protected routes - cần GardenProvider và SocketProvider */}
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <SocketProvider>
                          <NotificationProvider>
                            <GardenProvider>
                              <Dashboard />
                            </GardenProvider>
                          </NotificationProvider>
                        </SocketProvider>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Tương tự cho các route được bảo vệ khác */}
                  <Route 
                    path="/gardens" 
                    element={
                      <ProtectedRoute>
                        <SocketProvider>
                          <NotificationProvider>
                            <GardenProvider>
                              <GardenList />
                            </GardenProvider>
                          </NotificationProvider>
                        </SocketProvider>
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/gardens/new" 
                    element={
                      <ProtectedRoute>
                        <SocketProvider>
                          <NotificationProvider>
                            <GardenProvider>
                              <GardenForm />
                            </GardenProvider>
                          </NotificationProvider>
                        </SocketProvider>
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/gardens/:gardenId" 
                    element={
                      <ProtectedRoute>
                        <SocketProvider>
                          <NotificationProvider>
                            <GardenProvider>
                              <GardenDetail />
                            </GardenProvider>
                          </NotificationProvider>
                        </SocketProvider>
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/gardens/:gardenId/edit" 
                    element={
                      <ProtectedRoute>
                        <SocketProvider>
                          <NotificationProvider>
                            <GardenProvider>
                              <GardenForm />
                            </GardenProvider>
                          </NotificationProvider>
                        </SocketProvider>
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/notifications" 
                    element={
                      <ProtectedRoute>
                        <SocketProvider>
                          <NotificationProvider>
                            <Notifications />
                          </NotificationProvider>
                        </SocketProvider>
                      </ProtectedRoute>
                    } 
                  />

                  <Route 
                    path="/settings/profile" 
                    element={
                      <ProtectedRoute>
                        <SocketProvider>
                          <NotificationProvider>
                            <GardenProvider>
                              <Profile />
                            </GardenProvider>
                          </NotificationProvider>
                        </SocketProvider>
                      </ProtectedRoute>
                    } 
                  />

                  {/* Admin Routes */}
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/device-serials" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <DeviceSerials />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/users" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <UserManagement />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/users/:userId" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <UserDetail />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/gardens" 
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <GardenProvider>
                          <AdminGardens />
                        </GardenProvider>
                      </ProtectedRoute>
                    } 
                  />
                </Routes>
                
                {/* Linh vật xuất hiện ở mọi trang */}
                <MascotContainer />
              </MascotProvider>
            </AuthProvider>
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;

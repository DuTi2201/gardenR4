import React from 'react';
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

// Tạo theme cho MUI
const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#2196f3',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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
  console.log('App rendering, current pathname:', window.location.pathname);
  return (
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
  );
}

export default App;

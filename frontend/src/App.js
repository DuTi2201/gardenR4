import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { GardenProvider } from './context/GardenContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GardenList from './pages/GardenList';
import GardenDetail from './pages/GardenDetail';
import GardenForm from './pages/GardenForm';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

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
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Đang tải...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <SocketProvider>
            <GardenProvider>
              <NotificationProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected routes */}
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/gardens" 
                    element={
                      <ProtectedRoute>
                        <GardenList />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/gardens/new" 
                    element={
                      <ProtectedRoute>
                        <GardenForm />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/gardens/:gardenId" 
                    element={
                      <ProtectedRoute>
                        <GardenDetail />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/gardens/:gardenId/edit" 
                    element={
                      <ProtectedRoute>
                        <GardenForm />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />

                  {/* 404 route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NotificationProvider>
            </GardenProvider>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;

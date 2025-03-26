import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate('/login', { replace: true });
      } else if (requireAdmin && currentUser.role !== 'admin') {
        // Nếu đường dẫn yêu cầu quyền admin và người dùng không phải admin
        navigate('/', { replace: true });
      }
    }
  }, [currentUser, loading, navigate, requireAdmin]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Không hiển thị nội dung nếu chưa đăng nhập hoặc không có quyền admin khi cần
  if (!currentUser || (requireAdmin && currentUser.role !== 'admin')) {
    return null;
  }

  return children;
};

export default ProtectedRoute; 
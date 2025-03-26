import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  TextField,
  Link,
  Grid,
  Box,
  Typography,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useMascot } from '../components/Mascot/MascotContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, currentUser, loading, error } = useAuth();
  const { setHappy, showMessage } = useMascot();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Kiểm tra nếu người dùng đã đăng nhập
    if (currentUser) {
      // Chuyển hướng dựa trên vai trò
      if (currentUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (!formData.email || !formData.password) {
      return;
    }

    try {
      // Xóa hết các session cũ (nếu có) trước khi đăng nhập
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Đăng nhập
      const userData = await login(formData.email, formData.password);
      console.log("Login response data:", userData);
      
      // Kiểm tra xác thực thành công trước khi chuyển hướng
      if (userData && userData.token) {
        setHappy();
        showMessage('Đăng nhập thành công! Chào mừng bạn trở lại.', 3000);
        
        // Chuyển hướng dựa trên vai trò
        if (userData.role === 'admin') {
          console.log("Redirecting to admin dashboard");
          navigate('/admin');
        } else {
          console.log("Redirecting to home page");
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Lỗi đã được xử lý trong AuthContext
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            width: '100%',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlined />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Đăng nhập
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              error={submitted && !formData.email}
              helperText={submitted && !formData.email ? 'Vui lòng nhập email' : ''}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={submitted && !formData.password}
              helperText={submitted && !formData.password ? 'Vui lòng nhập mật khẩu' : ''}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </Button>
            <Grid container justifyContent={isMobile ? 'center' : 'space-between'} flexDirection={isMobile ? 'column' : 'row'} alignItems="center">
              <Grid item xs={12} sm="auto" sx={{ mb: isMobile ? 1 : 0, textAlign: isMobile ? 'center' : 'left' }}>
                <Link component={RouterLink} to="/forgot-password" variant="body2">
                  Quên mật khẩu?
                </Link>
              </Grid>
              <Grid item xs={12} sm="auto" sx={{ textAlign: isMobile ? 'center' : 'right' }}>
                <Link component={RouterLink} to="/register" variant="body2">
                  Chưa có tài khoản? Đăng ký
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 
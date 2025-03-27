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
  alpha,
} from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff, SpaOutlined } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useMascot } from '../components/Mascot/MascotContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, currentUser, loading, error } = useAuth();
  const { setHappy, showMessage } = useMascot();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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

  // Hiệu ứng nền gradient
  const gradientBackground = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(232, 245, 233, 0.8) 0%, rgba(200, 230, 201, 0.8) 50%, rgba(165, 214, 167, 0.8) 100%)',
    zIndex: -1,
  };

  // Hiệu ứng vòng tròn trang trí
  const decorativeCircles = [
    {
      position: 'absolute',
      top: '10%',
      left: '10%',
      width: isMobile ? '150px' : '300px',
      height: isMobile ? '150px' : '300px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 70%, transparent 100%)',
    },
    {
      position: 'absolute',
      bottom: '5%',
      right: '15%',
      width: isMobile ? '120px' : '250px',
      height: isMobile ? '120px' : '250px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(129, 199, 132, 0.1) 0%, rgba(129, 199, 132, 0.05) 70%, transparent 100%)',
    },
    {
      position: 'absolute',
      top: '40%',
      right: '5%',
      width: isMobile ? '100px' : '180px',
      height: isMobile ? '100px' : '180px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(200, 230, 201, 0.15) 0%, rgba(200, 230, 201, 0.05) 70%, transparent 100%)',
    },
  ];

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Nền gradient */}
      <Box sx={gradientBackground} />
      
      {/* Vòng tròn trang trí */}
      {decorativeCircles.map((circle, index) => (
        <Box key={index} sx={circle} />
      ))}
      
      <Container 
        component="main" 
        maxWidth="xs" 
        sx={{ 
          position: 'relative', 
          zIndex: 1,
          px: isMobile ? 2 : 3,  
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100%',
            py: { xs: 4, sm: 6 },
          }}
        >
          
          
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 4,
              width: '100%',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              animation: 'slideUp 0.6s ease-out',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="glass"
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background: 'linear-gradient(90deg, #4CAF50, #81C784, #4CAF50)',
                backgroundSize: '200% 200%',
                animation: 'gradient 3s ease infinite',
              }}
            />
            
            {/* Logo linh vật */}
          <Box sx={{ mb: { xs: 3, sm: 4 }, textAlign: 'center' }}>
            <Box
              component="img"
              src="/assets/linh_vat_2.png"
              alt="Smart Garden"
              sx={{
                width: isMobile ? 80 : 120,
                height: isMobile ? 80 : 120,
                objectFit: 'contain',
                mb: 1,
                animation: 'fadeIn 1.5s ease-in-out',
              }}
            />
            <Typography 
              variant={isMobile ? "h5" : "h4"}
              component="div" 
              sx={{ 
                fontWeight: 700, 
                color: 'primary.dark',
                letterSpacing: '0.5px',
                mb: 1,
                fontSize: { xs: '1.5rem', sm: '2.125rem' },
              }}
            >
              Smart Garden
            </Typography>
            <Typography 
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              Chào mừng bạn trở lại!
            </Typography>
          </Box>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  width: '100%', 
                  mb: 2,
                  borderRadius: 2,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  '& .MuiAlert-icon': {
                    color: 'error.main'
                  }
                }}
              >
                {error}
              </Alert>
            )}

            <Box 
              component="form" 
              onSubmit={handleSubmit} 
              noValidate 
              sx={{ 
                mt: { xs: 0, sm: 1 }, 
                width: '100%' 
              }}
            >
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
                variant="outlined"
                InputProps={{
                  sx: {
                    borderRadius: 2,
                    backgroundColor: alpha('#fff', 0.8),
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.95),
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                    }
                  }
                }}
                sx={{ mb: { xs: 1, sm: 2 } }}
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
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: 'text.secondary' }}
                        size={isMobile ? "small" : "medium"}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 2,
                    backgroundColor: alpha('#fff', 0.8),
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.95),
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#fff',
                    }
                  }
                }}
                sx={{ mt: 0 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: { xs: 2, sm: 3 },
                  mb: { xs: 1, sm: 2 },
                  py: { xs: 1, sm: 1.5 },
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.25)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 18px rgba(76, 175, 80, 0.35)',
                    transform: 'translateY(-2px)',
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </Button>
              <Grid 
                container 
                justifyContent={isMobile ? 'center' : 'space-between'} 
                flexDirection={isMobile ? 'column' : 'row'} 
                alignItems="center"
                sx={{ mt: { xs: 1, sm: 2 } }}
                spacing={isMobile ? 1 : 0}
              >
                <Grid item xs={12} sm="auto" sx={{ mb: isMobile ? 1 : 0, textAlign: isMobile ? 'center' : 'left' }}>
                  <Link 
                    component={RouterLink} 
                    to="/forgot-password" 
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 500,
                      textDecoration: 'none',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      '&:hover': {
                        textDecoration: 'underline',
                      }
                    }}
                  >
                    Quên mật khẩu?
                  </Link>
                </Grid>
                <Grid item xs={12} sm="auto" sx={{ textAlign: isMobile ? 'center' : 'right' }}>
                  <Link 
                    component={RouterLink} 
                    to="/register" 
                    variant="body2"
                    sx={{
                      color: 'primary.dark',
                      fontWeight: 500,
                      textDecoration: 'none',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      '&:hover': {
                        textDecoration: 'underline',
                      }
                    }}
                  >
                    Chưa có tài khoản? Đăng ký
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </Paper>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center"
            sx={{ 
              mt: { xs: 2, sm: 4 },
              opacity: 0.8,
              fontSize: { xs: '0.7rem', sm: '0.75rem' }
            }}
          >
            © {new Date().getFullYear()} Smart Garden. Bản quyền thuộc về SmartGarden Inc.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login; 
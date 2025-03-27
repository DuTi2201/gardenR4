import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/Layout/MainLayout';
import {
  Container,
  Grid,
  Typography,
  Paper,
  Button,
  TextField,
  Box,
  Avatar,
  Divider,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
  LockReset as LockResetIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

const Profile = () => {
  const { currentUser, updateProfile, changePassword, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const [profileFormData, setProfileFormData] = useState({
    fullname: currentUser?.fullname || '',
    email: currentUser?.email || '',
    avatar: currentUser?.avatar || '',
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState('');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Reset notifications on tab change
    setError('');
    setSuccess('');
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData({
      ...profileFormData,
      [name]: value,
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData({
      ...passwordFormData,
      [name]: value,
    });
    
    // Check password strength when newPassword changes
    if (name === 'newPassword') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    // Reset if empty
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback('');
      return;
    }
    
    let strength = 0;
    let feedback = '';
    
    // Length check
    if (password.length >= 8) {
      strength += 25;
    } else {
      feedback = 'Mật khẩu nên có ít nhất 8 ký tự';
    }
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = 'Nên có ít nhất một ký tự in hoa';
    }
    
    // Contains number
    if (/\d/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = 'Nên có ít nhất một chữ số';
    }
    
    // Contains special char
    if (/[^A-Za-z0-9]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = 'Nên có ít nhất một ký tự đặc biệt';
    }
    
    // Set feedback based on strength
    if (strength === 100 && !feedback) {
      feedback = 'Mật khẩu mạnh!';
    } else if (strength >= 75 && !feedback) {
      feedback = 'Mật khẩu khá tốt';
    } else if (strength >= 50 && !feedback) {
      feedback = 'Mật khẩu trung bình';
    } else if (strength >= 25 && !feedback) {
      feedback = 'Mật khẩu yếu';
    }
    
    setPasswordStrength(strength);
    setPasswordFeedback(feedback);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 100) return theme.palette.success.main;
    if (passwordStrength >= 75) return '#8BC34A';
    if (passwordStrength >= 50) return '#FFC107';
    if (passwordStrength >= 25) return '#FF9800';
    return '#F44336';
  };

  const toggleShowPassword = (field) => {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field],
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!profileFormData.fullname) {
      setError('Vui lòng nhập họ tên');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await updateProfile({
        fullname: profileFormData.fullname,
        avatar: profileFormData.avatar,
      });
      
      setSuccess('Cập nhật thông tin thành công');
    } catch (err) {
      console.error('Lỗi khi cập nhật hồ sơ:', err);
      setError(err.response?.data?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordForm = () => {
    if (!passwordFormData.currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại');
      return false;
    }
    
    if (!passwordFormData.newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return false;
    }
    
    if (passwordFormData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return false;
    }
    
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return false;
    }
    
    return true;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      await changePassword({
        oldPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword,
      });
      
      setSuccess('Đổi mật khẩu thành công');
      
      // Xóa dữ liệu form mật khẩu
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Reset password strength
      setPasswordStrength(0);
      setPasswordFeedback('');
    } catch (err) {
      console.error('Lỗi khi đổi mật khẩu:', err);
      setError(err.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleLogout = () => {
    logout();
    setOpenDialog(false);
  };

  if (!currentUser) {
    return (
      <MainLayout>
        <Container maxWidth="md">
          <Alert severity="warning">
            Bạn cần đăng nhập để xem trang này.
          </Alert>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="md">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            background: isDark ? 
              'linear-gradient(145deg, rgba(40,44,52,1) 0%, rgba(22,28,36,1) 100%)' : 
              'linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(246,249,252,1) 100%)',
            boxShadow: isDark ? 
              '0 8px 24px rgba(0,0,0,0.2)' : 
              '0 8px 24px rgba(0,0,0,0.05)',
            borderRadius: '12px',
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isDark ? 
                '0 12px 30px rgba(0,0,0,0.3)' : 
                '0 12px 30px rgba(0,0,0,0.1)',
            }
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                sx={{ 
                  width: 100, 
                  height: 100, 
                  bgcolor: 'primary.main',
                  border: '4px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                src={currentUser.avatar}
              >
                {!currentUser.avatar && (
                  <PersonIcon sx={{ fontSize: 60 }} />
                )}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{
                  fontWeight: 'bold',
                  background: isDark ? 
                    'linear-gradient(45deg, #5C6BC0, #26C6DA)' : 
                    'linear-gradient(45deg, #3949AB, #00ACC1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {currentUser.fullname}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {currentUser.email}
              </Typography>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                color="error"
                onClick={handleOpenDialog}
                sx={{ 
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.1)
                  }
                }}
              >
                Đăng xuất
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 3,
            borderRadius: '12px',
            boxShadow: isDark ? 
              '0 8px 24px rgba(0,0,0,0.2)' : 
              '0 8px 24px rgba(0,0,0,0.05)',
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  minHeight: '48px',
                  transition: 'all 0.2s ease',
                },
                '& .Mui-selected': {
                  color: theme.palette.primary.main,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.primary.main,
                  height: 3,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <Tab 
                label="Thông tin cá nhân" 
                icon={<PersonIcon />} 
                iconPosition="start" 
              />
              <Tab 
                label="Đổi mật khẩu" 
                icon={<SecurityIcon />} 
                iconPosition="start" 
              />
            </Tabs>
          </Box>

          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                borderRadius: '8px',
                animation: 'fadeIn 0.5s ease-in-out',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0, transform: 'translateY(-10px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              {success}
            </Alert>
          )}

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: '8px',
                animation: 'shake 0.5s ease-in-out',
                '@keyframes shake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                  '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                }
              }}
            >
              {error}
            </Alert>
          )}

          <div role="tabpanel" hidden={tabValue !== 0}>
            {tabValue === 0 && (
              <Box component="form" onSubmit={handleUpdateProfile}>
                <TextField
                  fullWidth
                  label="Họ và tên"
                  name="fullname"
                  value={profileFormData.fullname}
                  onChange={handleProfileChange}
                  margin="normal"
                  required
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={profileFormData.email}
                  margin="normal"
                  disabled
                  helperText="Email không thể thay đổi"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="URL Ảnh đại diện"
                  name="avatar"
                  value={profileFormData.avatar}
                  onChange={handleProfileChange}
                  margin="normal"
                  helperText="Nhập URL hình ảnh cho avatar của bạn"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  sx={{ 
                    mt: 3,
                    borderRadius: '8px',
                    padding: '10px 24px',
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </Box>
            )}
          </div>

          <div role="tabpanel" hidden={tabValue !== 1}>
            {tabValue === 1 && (
              <Box component="form" onSubmit={handleChangePassword}>
                <TextField
                  fullWidth
                  label="Mật khẩu hiện tại"
                  name="currentPassword"
                  type={showPassword.currentPassword ? 'text' : 'password'}
                  value={passwordFormData.currentPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  required
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => toggleShowPassword('currentPassword')}
                          edge="end"
                        >
                          {showPassword.currentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Mật khẩu mới"
                  name="newPassword"
                  type={showPassword.newPassword ? 'text' : 'password'}
                  value={passwordFormData.newPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  required
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => toggleShowPassword('newPassword')}
                          edge="end"
                        >
                          {showPassword.newPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                
                {passwordFormData.newPassword && (
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Độ mạnh mật khẩu:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: getPasswordStrengthColor(),
                          fontWeight: 'bold'
                        }}
                      >
                        {passwordFeedback}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={passwordStrength}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.grey[500], 0.2),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getPasswordStrengthColor(),
                          borderRadius: 4,
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      Mật khẩu tốt nên có ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt
                    </Typography>
                  </Box>
                )}

                <TextField
                  fullWidth
                  label="Nhập lại mật khẩu mới"
                  name="confirmPassword"
                  type={showPassword.confirmPassword ? 'text' : 'password'}
                  value={passwordFormData.confirmPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  required
                  error={passwordFormData.confirmPassword && passwordFormData.newPassword !== passwordFormData.confirmPassword}
                  helperText={passwordFormData.confirmPassword && passwordFormData.newPassword !== passwordFormData.confirmPassword ? 'Mật khẩu không khớp' : ''}
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => toggleShowPassword('confirmPassword')}
                          edge="end"
                        >
                          {showPassword.confirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<LockResetIcon />}
                  sx={{ 
                    mt: 3,
                    borderRadius: '8px',
                    padding: '10px 24px',
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    transition: 'all 0.3s ease',
                    background: isDark ? 
                      'linear-gradient(45deg, #1565C0, #0097A7)' :
                      'linear-gradient(45deg, #1976D2, #00ACC1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                      background: isDark ? 
                        'linear-gradient(45deg, #0D47A1, #00838F)' :
                        'linear-gradient(45deg, #1565C0, #0097A7)',
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </Button>
              </Box>
            )}
          </div>
        </Paper>

        {/* Hộp thoại xác nhận đăng xuất */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          PaperProps={{
            sx: {
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }
          }}
        >
          <DialogTitle>
            Xác nhận đăng xuất
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseDialog}
              sx={{ 
                borderRadius: '8px',
                textTransform: 'none',
              }}
            >
              Hủy bỏ
            </Button>
            <Button 
              onClick={handleLogout} 
              color="error"
              variant="contained"
              sx={{ 
                borderRadius: '8px',
                textTransform: 'none',
              }}
            >
              Đăng xuất
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
};

export default Profile; 
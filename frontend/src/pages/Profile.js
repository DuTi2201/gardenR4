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
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

const Profile = () => {
  const { currentUser, updateProfile, changePassword, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                sx={{ width: 100, height: 100, bgcolor: 'primary.main' }}
                src={currentUser.avatar}
              >
                {!currentUser.avatar && (
                  <PersonIcon sx={{ fontSize: 60 }} />
                )}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" component="h1">
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
              >
                Đăng xuất
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Thông tin cá nhân" />
              <Tab label="Đổi mật khẩu" />
            </Tabs>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
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
                />

                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={profileFormData.email}
                  margin="normal"
                  disabled
                  helperText="Email không thể thay đổi"
                />

                <TextField
                  fullWidth
                  label="URL Ảnh đại diện"
                  name="avatar"
                  value={profileFormData.avatar}
                  onChange={handleProfileChange}
                  margin="normal"
                  helperText="Nhập URL hình ảnh cho avatar của bạn"
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  sx={{ mt: 3 }}
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
                  helperText="Mật khẩu phải có ít nhất 6 ký tự"
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

                <TextField
                  fullWidth
                  label="Nhập lại mật khẩu mới"
                  name="confirmPassword"
                  type={showPassword.confirmPassword ? 'text' : 'password'}
                  value={passwordFormData.confirmPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  required
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
                  sx={{ mt: 3 }}
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
            <Button onClick={handleCloseDialog}>
              Hủy bỏ
            </Button>
            <Button onClick={handleLogout} color="error">
              Đăng xuất
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
};

export default Profile; 
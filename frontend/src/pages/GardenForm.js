import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import MainLayout from '../components/Layout/MainLayout';
import {
  Container,
  Grid,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  FormHelperText,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const GardenForm = () => {
  const { gardenId } = useParams();
  const navigate = useNavigate();
  const { getGardenById, createGarden, updateGarden, verifySerial } = useGarden();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    device_serial: '',
    has_camera: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [serialVerified, setSerialVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [mode, setMode] = useState('create');

  useEffect(() => {
    if (gardenId) {
      setMode('edit');
      fetchGardenData();
    }
  }, [gardenId]);

  const fetchGardenData = async () => {
    try {
      setLoading(true);
      const garden = await getGardenById(gardenId);
      setFormData({
        name: garden.name || '',
        description: garden.description || '',
        device_serial: garden.device_serial || '',
        has_camera: garden.has_camera || false,
      });
      // Vì vườn đã tồn tại, chúng ta mặc định cho là serial đã được xác minh
      setSerialVerified(true);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu vườn:', err);
      setError('Không thể tải thông tin vườn. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
    // Nếu trường là device_serial và đã thay đổi, đánh dấu là chưa xác minh
    if (name === 'device_serial' && value !== formData.device_serial) {
      setSerialVerified(false);
      setVerifyError('');
    }
    
    setFormData({
      ...formData,
      [name]: name === 'has_camera' ? checked : value,
    });
  };

  const handleVerifySerial = async () => {
    if (!formData.device_serial) {
      setVerifyError('Vui lòng nhập mã serial của thiết bị');
      return;
    }
    
    try {
      setVerifyLoading(true);
      setVerifyError('');
      await verifySerial(formData.device_serial);
      setSerialVerified(true);
    } catch (err) {
      console.error('Lỗi khi xác minh serial:', err);
      setVerifyError(err.response?.data?.message || 'Mã serial không hợp lệ hoặc đã được sử dụng');
      setSerialVerified(false);
    } finally {
      setVerifyLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.name) {
      setError('Vui lòng nhập tên vườn');
      return false;
    }
    
    if (mode === 'create' && !formData.device_serial) {
      setError('Vui lòng nhập mã serial của thiết bị');
      return false;
    }
    
    if (mode === 'create' && !serialVerified) {
      setError('Vui lòng xác minh mã serial thiết bị trước khi tạo vườn');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaveLoading(true);
      setError('');
      
      if (mode === 'create') {
        await createGarden(formData);
      } else {
        await updateGarden(gardenId, formData);
      }
      
      navigate('/gardens');
    } catch (err) {
      console.error('Lỗi khi lưu vườn:', err);
      setError(err.response?.data?.message || 'Không thể lưu thông tin vườn. Vui lòng thử lại sau.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="md">
        <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Grid item xs>
            <Typography variant="h4" component="h1">
              {mode === 'create' ? 'Thêm vườn mới' : 'Chỉnh sửa vườn'}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<CloseIcon />}
              onClick={() => navigate('/gardens')}
            >
              Hủy bỏ
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Tên vườn"
              name="name"
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Mô tả"
              name="description"
              value={formData.description}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={3}
            />

            <TextField
              fullWidth
              label="Mã Serial"
              name="device_serial"
              value={formData.device_serial}
              onChange={handleChange}
              margin="normal"
              required
              disabled={mode === 'edit'} // Không cho phép sửa mã serial trong chế độ chỉnh sửa
              InputProps={{
                endAdornment: mode === 'create' ? (
                  <InputAdornment position="end">
                    <Button
                      onClick={handleVerifySerial}
                      disabled={!formData.device_serial || verifyLoading}
                      color={serialVerified ? 'success' : 'primary'}
                      size="small"
                    >
                      {verifyLoading ? 'Đang xác minh...' : 'Xác minh'}
                    </Button>
                    {serialVerified && (
                      <IconButton color="success" edge="end">
                        <CheckCircleIcon />
                      </IconButton>
                    )}
                    {verifyError && (
                      <IconButton color="error" edge="end">
                        <ErrorIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ) : null,
              }}
            />
            {verifyError && (
              <FormHelperText error>{verifyError}</FormHelperText>
            )}
            {serialVerified && (
              <FormHelperText sx={{ color: 'success.main' }}>
                Mã serial hợp lệ và sẵn sàng sử dụng
              </FormHelperText>
            )}

            <Box sx={{ my: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.has_camera}
                    onChange={handleChange}
                    name="has_camera"
                    color="primary"
                  />
                }
                label="Vườn có camera"
              />
              <FormHelperText>
                Bật nếu vườn của bạn được trang bị camera ESP32-CAM
              </FormHelperText>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              disabled={saveLoading || (mode === 'create' && !serialVerified)}
              fullWidth
            >
              {saveLoading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default GardenForm; 
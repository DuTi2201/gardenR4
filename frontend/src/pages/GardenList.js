import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import MainLayout from '../components/Layout/MainLayout';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

const GardenList = () => {
  const navigate = useNavigate();
  const { gardens, loading, error, fetchGardens, deleteGarden } = useGarden();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchGardens();
  }, []);

  const handleViewGarden = (garden) => {
    navigate(`/gardens/${garden._id}`);
  };

  const handleEditGarden = (garden) => {
    navigate(`/gardens/${garden._id}/edit`);
  };

  const handleDeleteClick = (garden) => {
    setSelectedGarden(garden);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmDelete = async () => {
    if (!selectedGarden) return;
    
    try {
      setDeleteLoading(true);
      await deleteGarden(selectedGarden._id);
      setOpenDialog(false);
      // Không cần gọi fetchGardens vì deleteGarden đã cập nhật state
    } catch (err) {
      console.error('Lỗi khi xóa vườn:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getLastConnectedText = (lastConnected) => {
    if (!lastConnected) return 'Chưa kết nối';
    
    const date = new Date(lastConnected);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Vừa kết nối';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ngày trước`;
  };

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Grid item xs>
            <Typography variant="h4" component="h1">
              Danh sách vườn
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/gardens/new')}
            >
              Thêm vườn mới
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        ) : gardens.length === 0 ? (
          <Alert severity="info">
            Bạn chưa có vườn nào. Hãy tạo vườn mới để bắt đầu!
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {gardens.map((garden) => (
              <Grid item key={garden._id} xs={12} sm={6} md={4} lg={3}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    height="140"
                    image={garden.image || 'https://source.unsplash.com/random/?garden'}
                    alt={garden.name}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" component="div" gutterBottom>
                      {garden.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Mã thiết bị: {garden.device_serial}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" gutterBottom>
                      <strong>Kết nối cuối: </strong> 
                      {getLastConnectedText(garden.last_connected)}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Camera: </strong> 
                      {garden.has_camera ? 'Có' : 'Không'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, height: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {garden.description || 'Không có mô tả'}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => handleViewGarden(garden)}
                      startIcon={<VisibilityIcon />}
                    >
                      Xem
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleEditGarden(garden)}
                      startIcon={<EditIcon />}
                    >
                      Sửa
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton 
                      color="error"
                      onClick={() => handleDeleteClick(garden)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Hộp thoại xác nhận xóa */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            Xác nhận xóa vườn
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Bạn có chắc chắn muốn xóa vườn "{selectedGarden?.name}"? 
              Hành động này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={deleteLoading}>
              Hủy bỏ
            </Button>
            <Button 
              onClick={handleConfirmDelete} 
              color="error" 
              autoFocus
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
};

export default GardenList; 
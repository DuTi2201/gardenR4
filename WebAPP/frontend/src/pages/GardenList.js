import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarden } from '../context/GardenContext';
import MainLayout from '../components/Layout/MainLayout';
import ConnectionStatus from '../components/ConnectionStatus';
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
  useTheme,
  alpha,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  LocalFlorist as LocalFloristIcon,
  CalendarToday as CalendarTodayIcon,
  CameraAlt as CameraAltIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';

const GardenList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
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
        <Box
          sx={{
            mb: 5,
            pt: 2,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-80px',
              right: '-100px',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: isDarkMode 
                ? 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0) 70%)' 
                : 'radial-gradient(circle, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0) 70%)',
              filter: 'blur(30px)',
              zIndex: 0,
            }
          }}
        >
          <Grid container spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
            <Grid item xs>
              <Typography 
                variant="h4" 
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.8rem', sm: '2.2rem' },
                  background: isDarkMode 
                    ? 'linear-gradient(90deg, #86f386 0%, #5bc75b 100%)' 
                    : 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.5px',
                  mb: 1,
                }}
              >
                Danh sách vườn của bạn
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                  maxWidth: 600,
                  fontWeight: 400
                }}
              >
                Quản lý các vườn thông minh của bạn tại đây. Theo dõi thông tin cập nhật và quản lý hệ thống tưới tự động.
              </Typography>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/gardens/new')}
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: '12px',
                  background: isDarkMode
                    ? 'linear-gradient(45deg, #4caf50 0%, #66bb6a 100%)'
                    : 'linear-gradient(45deg, #2e7d32 0%, #43a047 100%)',
                  boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                  textTransform: 'none',
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 25px rgba(76, 175, 80, 0.4)',
                  }
                }}
              >
                Thêm vườn mới
              </Button>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress 
              size={60} 
              thickness={4} 
              sx={{ 
                color: isDarkMode ? '#66bb6a' : '#2e7d32',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                }
              }} 
            />
          </Box>
        ) : gardens.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 8,
              borderRadius: '20px',
              background: isDarkMode 
                ? 'linear-gradient(145deg, rgba(38, 50, 56, 0.6) 0%, rgba(55, 71, 79, 0.8) 100%)'
                : 'linear-gradient(145deg, rgba(236, 239, 241, 0.8) 0%, rgba(245, 245, 245, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: isDarkMode 
                ? '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
                : '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
              border: isDarkMode 
                ? '1px solid rgba(255, 255, 255, 0.05)'
                : '1px solid rgba(0, 0, 0, 0.02)',
            }}
          >
            <LocalFloristIcon 
              sx={{ 
                fontSize: 80, 
                mb: 3, 
                color: isDarkMode ? 'rgba(76, 175, 80, 0.8)' : 'rgba(76, 175, 80, 0.7)',
                filter: isDarkMode ? 'drop-shadow(0 0 10px rgba(76, 175, 80, 0.5))' : 'none',
              }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 2, 
                fontWeight: 600,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
              }}
            >
              Bạn chưa có vườn nào
            </Typography>
            <Typography 
              sx={{ 
                maxWidth: 500, 
                textAlign: 'center', 
                mb: 4,
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              }}
            >
              Hãy tạo một vườn mới để bắt đầu theo dõi và quản lý cây trồng của bạn với hệ thống tưới tự động thông minh.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => navigate('/gardens/new')}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: '12px',
                background: isDarkMode
                  ? 'linear-gradient(45deg, #4caf50 0%, #66bb6a 100%)'
                  : 'linear-gradient(45deg, #2e7d32 0%, #43a047 100%)',
                boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                fontWeight: 600,
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease',
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 25px rgba(76, 175, 80, 0.4)',
                }
              }}
            >
              Tạo vườn đầu tiên
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {gardens.map((garden) => (
              <Grid item key={garden._id} xs={12} sm={6} md={4} lg={3}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: isDarkMode 
                      ? alpha(theme.palette.background.paper, 0.8)  
                      : alpha(theme.palette.background.paper, 0.9),
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    boxShadow: isDarkMode 
                      ? '0 10px 30px rgba(0, 0, 0, 0.25)' 
                      : '0 10px 30px rgba(0, 0, 0, 0.07)',
                    border: isDarkMode 
                      ? '1px solid rgba(255, 255, 255, 0.05)' 
                      : '1px solid rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: isDarkMode 
                        ? '0 15px 35px rgba(0, 0, 0, 0.35), 0 0 15px rgba(76, 175, 80, 0.3)' 
                        : '0 15px 35px rgba(0, 0, 0, 0.1), 0 0 15px rgba(76, 175, 80, 0.2)',
                      '& .garden-image': {
                        transform: 'scale(1.05)',
                      },
                      '& .garden-name': {
                        color: isDarkMode ? '#7bed7b' : '#2e7d32',
                      },
                      '& .action-button': {
                        opacity: 1,
                        transform: 'translateY(0)',
                      }
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '100%',
                      height: '3px',
                      background: garden && garden.is_connected 
                        ? 'linear-gradient(90deg, #43a047, #66bb6a)' 
                        : isDarkMode 
                          ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))' 
                          : 'linear-gradient(90deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.02))',
                      zIndex: 10
                    }
                  }}
                >
                  <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                    <CardMedia
                      component="img"
                      className="garden-image"
                      height="160"
                      image={(garden && garden.image) ? garden.image : require('../assets/trong cay.jpeg')}
                      alt={garden ? garden.name : 'Garden'}
                      sx={{ 
                        transition: 'all 0.5s ease',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        position: 'relative'
                      }}
                    />
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 12, 
                        right: 12, 
                        zIndex: 10 
                      }}
                    >
                      <ConnectionStatus 
                        isConnected={garden && garden.is_connected} 
                        lastConnected={garden && garden.last_connected}
                        size="small"
                        variant="badge"
                        showText={false}
                      />
                    </Box>
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        left: 0, 
                        right: 0, 
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)', 
                        height: '80px',
                        pointerEvents: 'none'
                      }}
                    />
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1, px: 3, pt: 2, pb: 1, position: 'relative' }}>
                    <Typography 
                      variant="h6" 
                      component="div" 
                      className="garden-name"
                      sx={{ 
                        fontWeight: 600, 
                        mb: 1.5, 
                        fontSize: '1.2rem',
                        transition: 'color 0.3s ease',
                        color: isDarkMode ? '#ffffff' : theme.palette.text.primary,
                      }}
                    >
                      {garden && garden.name ? garden.name : 'Chưa có tên'}
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1.5 
                      }}
                    >
                      <QrCodeIcon 
                        sx={{ 
                          mr: 1.5, 
                          fontSize: '0.9rem', 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                        }} 
                      />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                        }}
                      >
                        {garden && garden.device_serial ? garden.device_serial : 'Chưa kết nối'}
                      </Typography>
                    </Box>
                    
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1.5 
                      }}
                    >
                      <CalendarTodayIcon 
                        sx={{ 
                          mr: 1.5, 
                          fontSize: '0.9rem', 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                        }} 
                      />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        {getLastConnectedText(garden && garden.last_connected)}
                      </Typography>
                    </Box>
                    
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2 
                      }}
                    >
                      <CameraAltIcon 
                        sx={{ 
                          mr: 1.5, 
                          fontSize: '0.9rem', 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                        }} 
                      />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        {garden && garden.has_camera ? 'Có camera' : 'Không có camera'}
                      </Typography>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
                        fontSize: '0.8rem',
                        height: 60, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        fontStyle: 'italic',
                        lineHeight: 1.4
                      }}
                    >
                      {garden && garden.description ? garden.description : 'Không có mô tả'}
                    </Typography>
                  </CardContent>
                  
                  <CardActions 
                    sx={{ 
                      justifyContent: 'center', 
                      gap: 1.5, 
                      pb: 2.5,
                      px: 3
                    }}
                  >
                    <Button
                      variant="contained"
                      className="action-button"
                      onClick={() => handleViewGarden(garden)}
                      sx={{
                        flex: 1,
                        borderRadius: '10px',
                        background: isDarkMode 
                          ? 'linear-gradient(45deg, #4caf50 0%, #66bb6a 100%)' 
                          : 'linear-gradient(45deg, #2e7d32 0%, #43a047 100%)',
                        boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)',
                        textTransform: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        transition: 'all 0.3s ease',
                        minHeight: '38px',
                        '&:hover': {
                          boxShadow: '0 6px 15px rgba(76, 175, 80, 0.4)',
                          transform: 'translateY(-2px)'
                        },
                        opacity: 0.9,
                        transform: 'translateY(5px)',
                      }}
                    >
                      Xem vườn
                    </Button>
                    
                    <Button
                      variant="outlined"
                      className="action-button"
                      onClick={() => handleEditGarden(garden)}
                      sx={{
                        flex: 1,
                        borderRadius: '10px',
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        transition: 'all 0.3s ease',
                        minHeight: '38px',
                        '&:hover': {
                          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                          transform: 'translateY(-2px)'
                        },
                        opacity: 0.9,
                        transform: 'translateY(5px)',
                      }}
                    >
                      Sửa
                    </Button>
                    
                    <IconButton 
                      color="error"
                      className="action-button"
                      onClick={() => handleDeleteClick(garden)}
                      sx={{
                        backgroundColor: isDarkMode ? 'rgba(244, 67, 54, 0.15)' : 'rgba(244, 67, 54, 0.1)',
                        transition: 'all 0.3s ease',
                        width: '38px',
                        height: '38px',
                        '&:hover': {
                          backgroundColor: isDarkMode ? 'rgba(244, 67, 54, 0.25)' : 'rgba(244, 67, 54, 0.15)',
                          transform: 'translateY(-2px)'
                        },
                        opacity: 0.9,
                        transform: 'translateY(5px)',
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: '1.1rem' }} />
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
          PaperProps={{
            sx: {
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
              background: isDarkMode
                ? 'linear-gradient(145deg, #303030 0%, #1e1e1e 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 100%)',
              overflow: 'hidden',
              border: isDarkMode
                ? '1px solid rgba(255, 255, 255, 0.05)'
                : '1px solid rgba(0, 0, 0, 0.02)',
            }
          }}
        >
          <DialogTitle 
            id="alert-dialog-title"
            sx={{
              fontSize: '1.3rem',
              fontWeight: 600,
              color: isDarkMode ? '#ff5252' : '#d32f2f',
              pt: 3,
              pb: 1,
            }}
          >
            Xác nhận xóa vườn
          </DialogTitle>
          <DialogContent>
            <DialogContentText 
              id="alert-dialog-description"
              sx={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                fontSize: '0.95rem',
                lineHeight: 1.5,
              }}
            >
              Bạn có chắc chắn muốn xóa vườn "{selectedGarden && selectedGarden.name ? selectedGarden.name : 'Không xác định'}"? 
              Hành động này không thể hoàn tác và tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ pb: 3, px: 3 }}>
            <Button 
              onClick={handleCloseDialog} 
              disabled={deleteLoading}
              sx={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.95rem',
                px: 3,
              }}
            >
              Hủy bỏ
            </Button>
            <Button 
              onClick={handleConfirmDelete} 
              color="error" 
              autoFocus
              disabled={deleteLoading}
              variant="contained"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                px: 3,
                py: 1,
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(244, 67, 54, 0.2)',
                background: 'linear-gradient(45deg, #d32f2f 0%, #f44336 100%)',
                '&:hover': {
                  boxShadow: '0 6px 15px rgba(244, 67, 54, 0.3)',
                }
              }}
            >
              {deleteLoading ? 'Đang xóa...' : 'Xóa vườn'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
};

export default GardenList; 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Divider, 
  Button, 
  IconButton,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { 
  Notifications as NotificationsIcon, 
  Delete as DeleteIcon, 
  Check as CheckIcon, 
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import MainLayout from '../components/Layout/MainLayout';
import { useNotification } from '../context/NotificationContext';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, deleteNotification, loading, error } = useNotification();
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    document.title = 'Thông báo | Vườn Thông Minh';
  }, []);

  const handleDelete = (notificationId) => {
    deleteNotification(notificationId);
  };

  const handleSelectNotification = (notification) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      markAsRead(notification._id);
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'success':
        return <CheckIcon color="success" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom component="h1">
          Thông báo
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {notifications.length === 0 ? (
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsIcon color="disabled" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6">Không có thông báo</Typography>
            <Typography variant="body2" color="textSecondary">
              Bạn sẽ nhận được thông báo khi có cảnh báo từ vườn hoặc cập nhật từ hệ thống
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Paper elevation={3} sx={{ width: '40%', maxHeight: '70vh', overflow: 'auto' }}>
              <List sx={{ p: 0 }}>
                {notifications.map((notification) => (
                  <React.Fragment key={notification._id}>
                    <ListItem 
                      button 
                      onClick={() => handleSelectNotification(notification)}
                      selected={selectedNotification && selectedNotification._id === notification._id}
                      sx={{ 
                        bgcolor: notification.is_read ? 'inherit' : 'rgba(76, 175, 80, 0.08)',
                        '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.12)' }
                      }}
                    >
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                fontWeight: notification.is_read ? 'normal' : 'bold',
                                width: '70%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {notification.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(notification.created_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}
                          >
                            {notification.message}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>

            <Paper elevation={3} sx={{ width: '60%', p: 3, maxHeight: '70vh', overflow: 'auto' }}>
              {selectedNotification ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getNotificationIcon(selectedNotification.type)}
                      <Typography variant="h5">{selectedNotification.title}</Typography>
                    </Box>
                    <Box>
                      <Chip 
                        label={selectedNotification.garden_name || 'Hệ thống'} 
                        color="primary" 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      <IconButton 
                        color="error" 
                        onClick={() => handleDelete(selectedNotification._id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    {formatDateTime(selectedNotification.created_at)}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
                    {selectedNotification.message}
                  </Typography>

                  {selectedNotification.target_id && (
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={() => navigate(`/gardens/${selectedNotification.target_id}`)}
                    >
                      Xem chi tiết vườn
                    </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                  <Typography variant="body1" color="textSecondary">
                    Chọn một thông báo để xem chi tiết
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Container>
    </MainLayout>
  );
};

export default Notifications; 
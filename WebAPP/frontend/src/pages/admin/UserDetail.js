import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, CircularProgress, Alert,
  Grid, Divider, List, ListItem, ListItemText, Avatar, Chip, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
  Spa as SpaIcon,
  ArrowBack as ArrowBackIcon,
  SupervisorAccount as AdminIcon,
  PersonOutline as UserIcon
} from '@mui/icons-material';
import api from '../../services/api';
import AdminLayout from '../../components/layouts/AdminLayout';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const [userResponse, gardensResponse] = await Promise.all([
          api.get(`/admin/users/${userId}`),
          api.get(`/admin/users/${userId}/gardens`)
        ]);
        
        setUser(userResponse.data.data);
        setGardens(gardensResponse.data.data);
      } catch (err) {
        console.error('Lỗi khi tải thông tin người dùng:', err);
        setError('Không thể tải thông tin người dùng. ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  if (loading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Container maxWidth="lg">
          <Box mt={3}>
            <Alert severity="error">{error}</Alert>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => navigate('/admin/users')}
            >
              Quay lại danh sách người dùng
            </Button>
          </Box>
        </Container>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <Container maxWidth="lg">
          <Box mt={3}>
            <Alert severity="warning">Không tìm thấy thông tin người dùng</Alert>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => navigate('/admin/users')}
            >
              Quay lại danh sách người dùng
            </Button>
          </Box>
        </Container>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Box mt={3} mb={4}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Button
                startIcon={<ArrowBackIcon />}
                variant="outlined"
                onClick={() => navigate('/admin/users')}
              >
                Quay lại
              </Button>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" component="h1">
                Thông tin người dùng
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Grid container spacing={3}>
          {/* Thông tin người dùng */}
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                <Avatar
                  src={user.avatar}
                  alt={user.fullname}
                  sx={{ width: 100, height: 100, mb: 2 }}
                >
                  {user.fullname ? user.fullname.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <Typography variant="h5" component="h2">
                  {user.fullname}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <Chip
                    icon={user.role === 'admin' ? <AdminIcon /> : <UserIcon />}
                    label={user.role === 'admin' ? 'Admin' : 'Người dùng'}
                    color={user.role === 'admin' ? 'error' : 'primary'}
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <List>
                <ListItem>
                  <EmailIcon color="action" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Email"
                    secondary={user.email}
                  />
                </ListItem>
                <ListItem>
                  <AccessTimeIcon color="action" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Ngày đăng ký"
                    secondary={user.created_at ? new Date(user.created_at).toLocaleString('vi-VN') : 'Không có thông tin'}
                  />
                </ListItem>
                <ListItem>
                  <AccessTimeIcon color="action" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Đăng nhập gần nhất"
                    secondary={user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* Danh sách vườn */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Danh sách vườn ({gardens.length})
              </Typography>
              
              {gardens.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Người dùng này chưa có vườn nào
                </Alert>
              ) : (
                <TableContainer sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tên vườn</TableCell>
                        <TableCell>Mã thiết bị</TableCell>
                        <TableCell>Có camera</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell>Ngày tạo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gardens.map(garden => garden && (
                        <TableRow key={garden._id || 'unknown'}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {garden.name || 'Chưa có tên'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {garden.description || 'Không có mô tả'}
                            </Typography>
                          </TableCell>
                          <TableCell>{garden.device_serial || 'Chưa kết nối'}</TableCell>
                          <TableCell>
                            {garden.has_camera ? (
                              <Chip size="small" label="Có" color="success" />
                            ) : (
                              <Chip size="small" label="Không" color="default" />
                            )}
                          </TableCell>
                          <TableCell>
                            {garden.is_connected ? (
                              <Chip size="small" label="Online" color="success" />
                            ) : (
                              <Chip size="small" label="Offline" color="error" />
                            )}
                          </TableCell>
                          <TableCell>
                            {garden.created_at ? new Date(garden.created_at).toLocaleDateString('vi-VN') : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </AdminLayout>
  );
};

export default UserDetail;

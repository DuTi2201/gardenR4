import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container, Grid, Paper, Typography, Box, Divider, CircularProgress, Card, CardContent,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Button
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  People as PeopleIcon,
  Spa as SpaIcon,
  Memory as MemoryIcon,
  Check as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import api from '../../services/api';
import AdminLayout from '../../components/layouts/AdminLayout';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log("Fetching dashboard data...");
        const response = await api.get('/admin/dashboard');
        console.log("Dashboard API response:", response.data);
        setDashboardData(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Dashboard API error:', err);
        setError('Không thể tải dữ liệu bảng điều khiển. ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Box mt={3} display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h6" color="error" gutterBottom>{error}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </Box>
      </AdminLayout>
    );
  }

  const StatCard = ({ icon, title, value, color, suffix = '' }) => (
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          {icon}
          <Typography variant="h6" component="div" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" color={color}>
          {value}{suffix}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Box mt={3} mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Bảng điều khiển Admin
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Xem tổng quan về thông tin hệ thống Smart Garden
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Thống kê tổng quan */}
          <Grid item xs={12} md={4}>
            <StatCard
              icon={<PeopleIcon fontSize="large" color="primary" />}
              title="Tổng người dùng"
              value={dashboardData?.totalUsers || 0}
              color="primary.main"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              icon={<SpaIcon fontSize="large" color="success" />}
              title="Tổng vườn thông minh"
              value={dashboardData?.totalGardens || 0}
              color="success.main"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              icon={<MemoryIcon fontSize="large" color="secondary" />}
              title="Tổng mã thiết bị"
              value={dashboardData?.totalDeviceSerials || 0}
              color="secondary.main"
            />
          </Grid>

          {/* Thống kê thiết bị */}
          <Grid item xs={12} md={6}>
            <StatCard
              icon={<CheckIcon fontSize="large" color="success" />}
              title="Thiết bị đã kích hoạt"
              value={dashboardData?.activatedDevices || 0}
              color="success.main"
              suffix={` (${Math.round(
                (dashboardData?.activatedDevices / (dashboardData?.totalDeviceSerials || 1)) * 100
              )}%)`}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <StatCard
              icon={<WarningIcon fontSize="large" color="warning" />}
              title="Thiết bị chưa kích hoạt"
              value={dashboardData?.inactiveDevices || 0}
              color="warning.main"
              suffix={` (${Math.round(
                (dashboardData?.inactiveDevices / (dashboardData?.totalDeviceSerials || 1)) * 100
              )}%)`}
            />
          </Grid>

          {/* Thống kê gần đây */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Hoạt động trong 7 ngày qua
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center">
                    <PeopleIcon color="primary" fontSize="large" sx={{ mr: 2 }} />
                    <div>
                      <Typography variant="body2" color="textSecondary">
                        Người dùng mới
                      </Typography>
                      <Typography variant="h5">{dashboardData?.newUsers || 0}</Typography>
                    </div>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center">
                    <SpaIcon color="success" fontSize="large" sx={{ mr: 2 }} />
                    <div>
                      <Typography variant="body2" color="textSecondary">
                        Vườn mới được tạo
                      </Typography>
                      <Typography variant="h5">{dashboardData?.newGardens || 0}</Typography>
                    </div>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Liên kết nhanh */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Liên kết nhanh
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Button 
                    component={Link} 
                    to="/admin/users" 
                    variant="outlined" 
                    color="primary" 
                    startIcon={<PeopleIcon />}
                    fullWidth
                    sx={{ py: 1 }}
                  >
                    Quản lý người dùng
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button 
                    component={Link} 
                    to="/admin/device-serials" 
                    variant="outlined" 
                    color="secondary" 
                    startIcon={<MemoryIcon />}
                    fullWidth
                    sx={{ py: 1 }}
                  >
                    Quản lý mã thiết bị
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button 
                    component={Link} 
                    to="/admin/gardens" 
                    variant="outlined" 
                    color="success" 
                    startIcon={<SpaIcon />}
                    fullWidth
                    sx={{ py: 1 }}
                  >
                    Xem tất cả vườn
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </AdminLayout>
  );
};

export default Dashboard; 
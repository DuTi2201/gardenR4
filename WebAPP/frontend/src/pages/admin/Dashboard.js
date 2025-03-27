import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container, Grid, Paper, Typography, Box, Divider, CircularProgress, Card, CardContent,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Button, useTheme, useMediaQuery
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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
    <Card 
      elevation={2} 
      sx={{ 
        height: '100%',
        borderRadius: { xs: 2, sm: 3 },
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              borderRadius: 2,
              bgcolor: `${color}.lighter`,
              color: color,
              mr: 1.5,
            }}
          >
            {icon}
          </Box>
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
            component="div" 
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '0.95rem', sm: '1.1rem' } 
            }}
          >
            {title}
          </Typography>
        </Box>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="div" 
          color={color}
          sx={{ 
            fontWeight: 700,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.2rem' }
          }}
        >
          {value}{suffix}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <Container maxWidth={false} disableGutters={isMobile} sx={{ px: { xs: 0, sm: 2 } }}>
        <Box mt={{ xs: 2, sm: 3 }} mb={{ xs: 3, sm: 4 }} px={{ xs: 2, sm: 0 }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '2rem' } 
            }}
          >
            Bảng điều khiển Admin
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Xem tổng quan về thông tin hệ thống Smart Garden
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Thống kê tổng quan */}
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<PeopleIcon fontSize={isMobile ? "medium" : "large"} />}
              title="Tổng người dùng"
              value={dashboardData?.totalUsers || 0}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<SpaIcon fontSize={isMobile ? "medium" : "large"} />}
              title="Tổng vườn thông minh"
              value={dashboardData?.totalGardens || 0}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<MemoryIcon fontSize={isMobile ? "medium" : "large"} />}
              title="Tổng mã thiết bị"
              value={dashboardData?.totalDeviceSerials || 0}
              color="secondary"
            />
          </Grid>

          {/* Thống kê thiết bị */}
          <Grid item xs={12} sm={6} md={6}>
            <StatCard
              icon={<CheckIcon fontSize={isMobile ? "medium" : "large"} />}
              title="Thiết bị đã kích hoạt"
              value={dashboardData?.activatedDevices || 0}
              color="success"
              suffix={` (${Math.round(
                (dashboardData?.activatedDevices / (dashboardData?.totalDeviceSerials || 1)) * 100
              )}%)`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <StatCard
              icon={<WarningIcon fontSize={isMobile ? "medium" : "large"} />}
              title="Thiết bị chưa kích hoạt"
              value={dashboardData?.inactiveDevices || 0}
              color="warning"
              suffix={` (${Math.round(
                (dashboardData?.inactiveDevices / (dashboardData?.totalDeviceSerials || 1)) * 100
              )}%)`}
            />
          </Grid>

          {/* Thống kê gần đây */}
          <Grid item xs={12}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: { xs: 2, sm: 3 }, 
                mt: { xs: 2, sm: 3 },
                borderRadius: { xs: 2, sm: 3 }
              }}
            >
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                gutterBottom
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' } 
                }}
              >
                Hoạt động trong 7 ngày qua
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box 
                    display="flex" 
                    alignItems="center"
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      bgcolor: 'primary.lighter',
                      borderRadius: 2,
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main', 
                        width: { xs: 40, sm: 48 }, 
                        height: { xs: 40, sm: 48 },
                        mr: 2 
                      }}
                    >
                      <PeopleIcon />
                    </Avatar>
                    <div>
                      <Typography 
                        variant="body2" 
                        color="textSecondary"
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                      >
                        Người dùng mới
                      </Typography>
                      <Typography 
                        variant={isMobile ? "h6" : "h5"}
                        sx={{ 
                          fontWeight: 700,
                          fontSize: { xs: '1.25rem', sm: '1.5rem' } 
                        }}
                      >
                        {dashboardData?.newUsers || 0}
                      </Typography>
                    </div>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box 
                    display="flex" 
                    alignItems="center"
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      bgcolor: 'success.lighter',
                      borderRadius: 2,
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: 'success.main', 
                        width: { xs: 40, sm: 48 }, 
                        height: { xs: 40, sm: 48 },
                        mr: 2 
                      }}
                    >
                      <SpaIcon />
                    </Avatar>
                    <div>
                      <Typography 
                        variant="body2" 
                        color="textSecondary"
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                      >
                        Vườn mới được tạo
                      </Typography>
                      <Typography 
                        variant={isMobile ? "h6" : "h5"}
                        sx={{ 
                          fontWeight: 700,
                          fontSize: { xs: '1.25rem', sm: '1.5rem' } 
                        }}
                      >
                        {dashboardData?.newGardens || 0}
                      </Typography>
                    </div>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Liên kết nhanh */}
          <Grid item xs={12}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: { xs: 2, sm: 3 }, 
                mt: { xs: 2, sm: 3 },
                borderRadius: { xs: 2, sm: 3 }
              }}
            >
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                gutterBottom
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' } 
                }}
              >
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
                    sx={{ 
                      py: { xs: 1, sm: 1.5 },
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }
                    }}
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
                    sx={{ 
                      py: { xs: 1, sm: 1.5 },
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }
                    }}
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
                    sx={{ 
                      py: { xs: 1, sm: 1.5 },
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }
                    }}
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
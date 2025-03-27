import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import useMascotTriggers from '../../hooks/useMascotTriggers';
import { useColorMode } from '../../App';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Container,
  Avatar,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  alpha,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Spa,
  AccountCircle,
  Notifications,
  Logout,
  Settings,
  Add,
  AdminPanelSettings,
  Close as CloseIcon,
  LightMode,
  DarkMode,
} from '@mui/icons-material';

const drawerWidth = 260;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { unreadCount, notifications, markAsRead } = useNotification();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { toggleColorMode, mode } = useColorMode();
  const isDarkMode = mode === 'dark';

  // Kiểm tra xem người dùng có phải admin hay không
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.email === 'admin@smartgarden.com');

  // Kích hoạt các trigger linh vật
  useMascotTriggers();
  
  // Đóng drawer khi chuyển trang trên mobile
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenNotificationsMenu = (event) => {
    setAnchorElNotifications(event.currentTarget);
  };

  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      text: 'Bảng điều khiển',
      icon: <Dashboard />,
      path: '/',
    },
    {
      text: 'Danh sách vườn',
      icon: <Spa />,
      path: '/gardens',
    },
    {
      text: 'Thêm vườn mới',
      icon: <Add />,
      path: '/gardens/new',
    },
  ];

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      backgroundColor: 'background.default', 
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {isMobile && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            p: 1,
          }}
        >
          <IconButton
            onClick={handleDrawerToggle}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: isMobile ? 1 : 2,
          backgroundColor: alpha('#4CAF50', 0.05),
        }}
      >
        <Box 
          component="div" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Box
            component="img"
            src="/assets/linh_vat_2.png"
            alt="Smart Garden"
            sx={{ 
              width: isMobile ? 32 : 40, 
              height: isMobile ? 32 : 40,
              mr: 1.5,
              borderRadius: '50%',
              boxShadow: '0 4px 8px rgba(76, 175, 80, 0.15)',
            }}
          />
          <Typography 
            variant="h6" 
            component="div" 
            color="primary.main"
            sx={{ 
              fontWeight: 600,
              fontSize: isMobile ? '1rem' : '1.2rem',
              letterSpacing: '0.5px',
            }}
          >
            Smart Garden
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ opacity: 0.6 }} />

      <List sx={{ p: 2, flex: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isSelected}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  pl: 2,
                  transition: 'all 0.2s ease',
                  backgroundColor: isSelected 
                    ? alpha('#4CAF50', 0.12)
                    : 'transparent',
                  color: isSelected ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isSelected 
                      ? alpha('#4CAF50', 0.17)
                      : alpha('#4CAF50', 0.08),
                  },
                  '&.Mui-selected': {
                    backgroundColor: alpha('#4CAF50', 0.12),
                    '&:hover': {
                      backgroundColor: alpha('#4CAF50', 0.17),
                    },
                  },
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: isSelected ? 'primary.main' : 'text.secondary',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: '0.95rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxShadow: 1,
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#242f3e' : '#ffffff',
          borderBottom: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Container maxWidth={false} disableGutters={isMobile} sx={{ px: isMobile ? 1 : 3 }}>
          <Toolbar sx={{ height: { xs: 60, sm: 70 }, minHeight: { xs: 60, sm: 70 }, px: { xs: 1, sm: 2 } }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { sm: 'none' },
                color: 'primary.main',
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ 
                flexGrow: 1, 
                display: { xs: 'none', sm: 'block' },
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                color: 'primary.main'
              }}
            >
              Smart Garden
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            {/* Theme Toggler Button */}
            <Box sx={{ mr: { xs: 1, sm: 2 } }}>
              <Tooltip title={isDarkMode ? "Chế độ sáng" : "Chế độ tối"}>
                <IconButton
                  size={isMobile ? "medium" : "large"}
                  aria-label="toggle dark mode"
                  onClick={toggleColorMode}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    },
                    borderRadius: 2,
                    width: { xs: 36, sm: 40 },
                    height: { xs: 36, sm: 40 },
                    color: 'primary.main',
                  }}
                >
                  {isDarkMode ? <LightMode fontSize={isMobile ? "small" : "medium"} /> : <DarkMode fontSize={isMobile ? "small" : "medium"} />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Notifications menu */}
            <Box sx={{ mr: { xs: 1, sm: 2 } }}>
              <Tooltip title="Thông báo">
                <IconButton
                  size={isMobile ? "medium" : "large"}
                  aria-label="show notifications"
                  color="primary"
                  onClick={handleOpenNotificationsMenu}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    },
                    borderRadius: 2,
                    width: { xs: 36, sm: 40 },
                    height: { xs: 36, sm: 40 },
                  }}
                >
                  <Badge badgeContent={unreadCount} color="error">
                    <Notifications fontSize={isMobile ? "small" : "medium"} />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ 
                  mt: '45px',
                  '& .MuiPaper-root': {
                    borderRadius: 3,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.background.paper, 0.9) 
                      : alpha('#FFFFFF', 0.9),
                    backdropFilter: 'blur(10px)',
                    minWidth: { xs: 300, sm: 350 },
                    maxWidth: '90vw',
                  }
                }}
                id="menu-notifications"
                anchorEl={anchorElNotifications}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElNotifications)}
                onClose={handleCloseNotificationsMenu}
              >
                <Box
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    Thông báo
                  </Typography>
                  {unreadCount > 0 && (
                    <Badge
                      badgeContent={unreadCount}
                      color="error"
                      sx={{ mr: 1 }}
                    />
                  )}
                </Box>

                <Box
                  sx={{
                    maxHeight: '350px',
                    overflowY: 'auto',
                    py: 1,
                  }}
                >
                  {/* Kiểm tra và hiển thị 5 thông báo gần nhất */}
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <MenuItem
                        key={notification._id}
                        onClick={() => {
                          // Đánh dấu thông báo đã đọc
                          markAsRead(notification._id);
                          // Xử lý điều hướng tùy vào loại thông báo nếu cần
                          if (notification.link) {
                            navigate(notification.link);
                          }
                          handleCloseNotificationsMenu();
                        }}
                        sx={{
                          borderRadius: 2,
                          mx: 1,
                          my: 0.5,
                          py: 1.5,
                          backgroundColor: notification.read ? 'transparent' : alpha('#4CAF50', 0.05),
                          borderLeft: notification.read ? 'none' : `3px solid ${theme.palette.primary.main}`,
                          '&:hover': {
                            backgroundColor: alpha('#4CAF50', 0.08),
                          }
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              mb: 0.5
                            }}
                          >
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                fontWeight: notification.read ? 400 : 600,
                                fontSize: '0.85rem',
                                color: 'text.primary',
                              }}
                            >
                              {notification.title}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'text.secondary',
                                fontSize: '0.7rem'
                              }}
                            >
                              {new Date(notification.createdAt).toLocaleDateString('vi-VN', { 
                                hour: '2-digit', 
                                minute: '2-digit'
                              })}
                            </Typography>
                          </Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.8rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {notification.message}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  ) : (
                    <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                      >
                        Bạn không có thông báo nào
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    p: 1,
                  }}
                >
                  <MenuItem 
                    onClick={() => {
                      navigate('/notifications');
                      handleCloseNotificationsMenu();
                    }}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      textAlign: 'center',
                      justifyContent: 'center',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: alpha('#4CAF50', 0.08),
                      }
                    }}
                  >
                    <Typography 
                      textAlign="center" 
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      }}
                    >
                      Xem tất cả thông báo
                    </Typography>
                  </MenuItem>
                </Box>
              </Menu>
            </Box>

            {/* User menu */}
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Tài khoản">
                <IconButton 
                  onClick={handleOpenUserMenu} 
                  sx={{ 
                    p: 0,
                    border: '2px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    borderRadius: '50%',
                    width: { xs: 38, sm: 42 },
                    height: { xs: 38, sm: 42 },
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <Avatar 
                    alt={currentUser?.fullname} 
                    src={currentUser?.avatar}
                    sx={{ width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 } }}
                  />
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ 
                  mt: '45px',
                  '& .MuiPaper-root': {
                    borderRadius: 3,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.background.paper, 0.9) 
                      : alpha('#FFFFFF', 0.9),
                    backdropFilter: 'blur(10px)',
                    minWidth: { xs: 180, sm: 200 },
                    maxWidth: '90vw',
                  }
                }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                {isAdmin && (
                  <MenuItem 
                    onClick={() => {
                      navigate('/admin');
                      handleCloseUserMenu();
                    }}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      mt: 1,
                      '&:hover': {
                        backgroundColor: alpha('#4CAF50', 0.08),
                      }
                    }}
                  >
                    <ListItemIcon>
                      <AdminPanelSettings fontSize="small" color="primary" />
                    </ListItemIcon>
                    <Typography>Quản trị hệ thống</Typography>
                  </MenuItem>
                )}
                <MenuItem 
                  onClick={() => {
                    navigate('/settings/profile');
                    handleCloseUserMenu();
                  }}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    mt: 1,
                    '&:hover': {
                      backgroundColor: alpha('#4CAF50', 0.08),
                    }
                  }}
                >
                  <ListItemIcon>
                    <Settings fontSize="small" color="primary" />
                  </ListItemIcon>
                  <Typography>Cài đặt</Typography>
                </MenuItem>
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 1,
                    '&:hover': {
                      backgroundColor: alpha('#F44336', 0.08),
                    }
                  }}
                >
                  <ListItemIcon>
                    <Logout fontSize="small" color="error" />
                  </ListItemIcon>
                  <Typography>Đăng xuất</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth, 
              boxSizing: 'border-box',
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#242f3e' : '#ffffff',
              borderRight: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: (theme) => theme.palette.mode === 'dark' ? '3px 0 10px rgba(0, 0, 0, 0.2)' : 'none',
            },
          }}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          height: '100%',
          overflow: 'auto',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#151a1f' : theme.palette.background.default,
        }}
      >
        <Toolbar /> {/* Needed for proper spacing below app bar */}
        <Box 
          sx={{ 
            flex: 1, 
            borderRadius: 3,
            overflow: 'hidden',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
          className="fade-in"
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout; 
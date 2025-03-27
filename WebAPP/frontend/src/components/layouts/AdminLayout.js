import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, CssBaseline, Toolbar, Typography, Divider, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar,
  Menu, MenuItem, useMediaQuery, useTheme, Button, SwipeableDrawer,
  alpha, Container
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Memory as MemoryIcon,
  Spa as SpaIcon,
  BarChart as BarChartIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 260;

const AdminLayout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Bảng điều khiển', icon: <DashboardIcon />, path: '/admin' },
    { text: 'Quản lý người dùng', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Quản lý mã thiết bị', icon: <MemoryIcon />, path: '/admin/device-serials' },
    { text: 'Xem tất cả vườn', icon: <SpaIcon />, path: '/admin/gardens' },
  ];

  // Kiểm tra nếu người dùng không phải admin thì chuyển hướng về trang chủ
  if (currentUser && currentUser.role !== 'admin') {
    navigate('/');
    return null;
  }

  const drawer = (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden'
    }}>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        py: { xs: 1, sm: 1 },
        minHeight: { xs: '56px', sm: '64px' }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src="/assets/linh_vat_2.png" 
            alt="Smart Garden Admin" 
            variant="square"
            sx={{ 
              width: 32, 
              height: 32, 
              mr: 1.5,
              borderRadius: 1 
            }}
          />
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '0.9rem', sm: '1.1rem' }
            }}
          >
            Smart Garden Admin
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ py: 1, flex: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isSelected}
                onClick={isMobile ? handleDrawerToggle : undefined}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  py: 1,
                  transition: 'all 0.2s ease',
                  backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  color: isSelected ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.primary.main, 0.08),
                  },
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  }
                }}
              >
                <ListItemIcon sx={{ color: isSelected ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    fontWeight: isSelected ? 600 : 400
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ py: 1 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            component={Link}
            to="/"
            sx={{
              borderRadius: 1,
              mx: 1,
              py: 1,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              }
            }}
            onClick={isMobile ? handleDrawerToggle : undefined}
          >
            <ListItemIcon sx={{ color: 'text.secondary', minWidth: 40 }}>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Về trang chủ" 
              primaryTypographyProps={{
                fontSize: { xs: '0.9rem', sm: '1rem' },
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              mx: 1,
              py: 1,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.08),
                color: 'error.main'
              }
            }}
          >
            <ListItemIcon sx={{ color: 'error.main', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Đăng xuất" 
              primaryTypographyProps={{
                fontSize: { xs: '0.9rem', sm: '1rem' },
                color: 'error.main'
              }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      <CssBaseline />
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          color: 'text.primary',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' 
        }}
        elevation={0}
      >
        <Container maxWidth={false} disableGutters={isSmallScreen} sx={{ px: isSmallScreen ? 1 : 2 }}>
          <Toolbar sx={{ height: { xs: 56, sm: 64 }, minHeight: { xs: 56, sm: 64 } }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { md: 'none' },
                color: 'primary.main'
              }}
            >
              <MenuIcon />
            </IconButton>
            <Box 
              sx={{ 
                display: { xs: 'none', sm: 'flex' }, 
                alignItems: 'center'
              }}
            >
              <Avatar 
                src="/assets/linh_vat_2.png" 
                alt="Smart Garden Admin" 
                variant="square"
                sx={{ 
                  width: 28, 
                  height: 28, 
                  mr: 1.5,
                  borderRadius: 1,
                  display: { xs: 'none', md: 'block' }
                }}
              />
              <Typography 
                variant="h6" 
                noWrap 
                component="div" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  color: 'primary.main'
                }}
              >
                Quản trị hệ thống Smart Garden
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {!isMobile && (
                <Button 
                  variant="outlined"
                  color="primary" 
                  component={Link} 
                  to="/"
                  startIcon={<HomeIcon />}
                  sx={{ 
                    mr: 2,
                    borderRadius: 2,
                    py: 0.5,
                    px: 1.5
                  }}
                >
                  Về trang chủ
                </Button>
              )}
              <IconButton
                size={isSmallScreen ? "medium" : "large"}
                edge="end"
                color="primary"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleUserMenuOpen}
                sx={{
                  ml: 1,
                  p: 0,
                  border: '2px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  borderRadius: '50%',
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                  }
                }}
              >
                {currentUser?.avatar ? (
                  <Avatar 
                    alt={currentUser.fullname} 
                    src={currentUser.avatar} 
                    sx={{ 
                      width: { xs: 32, sm: 36 }, 
                      height: { xs: 32, sm: 36 } 
                    }}
                  />
                ) : (
                  <AccountIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                )}
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={userMenuAnchor}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                sx={{ 
                  mt: '10px',
                  '& .MuiPaper-root': {
                    borderRadius: 2,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    backgroundColor: alpha('#FFFFFF', 0.9),
                    backdropFilter: 'blur(10px)',
                    minWidth: { xs: 180, sm: 200 },
                    maxWidth: '90vw',
                    overflow: 'visible',
                    '&::before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: -5,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  } 
                }}
              >
                <MenuItem 
                  onClick={() => { 
                    handleUserMenuClose(); 
                    navigate('/profile'); 
                  }}
                  sx={{
                    borderRadius: 1,
                    mx: 1,
                    mt: 1,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    }
                  }}
                >
                  <ListItemIcon>
                    <AccountIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText>Hồ sơ</ListItemText>
                </MenuItem>
                {isMobile && (
                  <MenuItem 
                    onClick={() => { 
                      handleUserMenuClose(); 
                      navigate('/'); 
                    }}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      }
                    }}
                  >
                    <ListItemIcon>
                      <HomeIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText>Về trang chủ</ListItemText>
                  </MenuItem>
                )}
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    borderRadius: 1,
                    mx: 1,
                    my: 1,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.error.main, 0.08),
                    }
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Đăng xuất</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Drawer di động */}
        {isMobile ? (
          <SwipeableDrawer
            variant="temporary"
            open={mobileOpen}
            onOpen={() => setMobileOpen(true)}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Cải thiện hiệu suất trên thiết bị di động
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)' 
              },
            }}
          >
            {drawer}
          </SwipeableDrawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                border: 'none',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' 
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 1.5, sm: 2, md: 3 }, 
          width: { md: `calc(100% - ${drawerWidth}px)` },
          marginTop: { xs: '56px', sm: '64px' },
          overflow: 'auto'
        }}
      >
        <Box className="fade-in" sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout; 
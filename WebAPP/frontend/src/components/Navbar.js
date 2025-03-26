import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';

{currentUser && (
  <Menu
    anchorEl={anchorElUser}
    keepMounted
    open={Boolean(anchorElUser)}
    onClose={handleCloseUserMenu}
  >
    <MenuItem 
      component={Link} 
      to="/profile" 
      onClick={handleCloseUserMenu}
    >
      <ListItemIcon>
        <AccountCircleIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Hồ sơ" />
    </MenuItem>
    
    <MenuItem 
      component={Link} 
      to="/notifications" 
      onClick={handleCloseUserMenu}
    >
      <ListItemIcon>
        <NotificationsIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Thông báo" />
    </MenuItem>

    {/* Hiển thị menu Admin Dashboard nếu user có role admin */}
    {currentUser.role === 'admin' && (
      <MenuItem 
        component={Link} 
        to="/admin" 
        onClick={handleCloseUserMenu}
      >
        <ListItemIcon>
          <DashboardIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Quản trị hệ thống" />
      </MenuItem>
    )}
    
    <Divider />
    <MenuItem onClick={handleLogout}>
      <ListItemIcon>
        <LogoutIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Đăng xuất" />
    </MenuItem>
  </Menu>
)} 
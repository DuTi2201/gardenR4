import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, CircularProgress, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, Tooltip, Avatar, Switch, FormControlLabel, Checkbox, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Spa as SpaIcon,
  Visibility as VisibilityIcon,
  SupervisorAccount as AdminIcon,
  PersonOutline as UserIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import AdminLayout from '../../components/layouts/AdminLayout';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    sendEmail: true,
    recipients: 'all', // 'all' hoặc 'selected'
    selectedUsers: []
  });

  // Load danh sách người dùng
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching users data...");
      const response = await api.get('admin/users');
      console.log("Users API response:", response.data);
      setUsers(response.data.data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Không thể tải danh sách người dùng. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Mở dialog thay đổi quyền
  const handleOpenRoleDialog = (user) => {
    setSelectedUser({...user});
    setOpenRoleDialog(true);
  };

  // Thay đổi quyền cho người dùng
  const handleUpdateRole = async () => {
    try {
      setLoading(true);
      console.log('Cập nhật quyền người dùng thành:', selectedUser.role);
      
      const response = await api.put(`admin/users/${selectedUser._id}/role`, {
        role: selectedUser.role // Sử dụng trực tiếp quyền đã chọn trong UI
      });
      
      // Cập nhật danh sách người dùng
      setUsers(users.map(user => 
        user._id === response.data.data._id ? response.data.data : user
      ));
      
      setOpenRoleDialog(false);
      setSuccess(`Đã cập nhật quyền cho ${response.data.data.fullname} thành ${response.data.data.role}`);
    } catch (err) {
      setError('Không thể cập nhật quyền. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Mở dialog xóa người dùng
  const handleOpenDeleteDialog = (user) => {
    setSelectedUser({...user});
    setOpenDeleteDialog(true);
  };

  // Xóa người dùng
  const handleDeleteUser = async () => {
    try {
      setLoading(true);
      
      // Gọi API xóa người dùng
      await api.delete(`admin/users/${selectedUser._id}`);
      
      // Cập nhật danh sách người dùng
      setUsers(users.filter(user => user._id !== selectedUser._id));
      
      setOpenDeleteDialog(false);
      setSuccess(`Đã xóa người dùng ${selectedUser.fullname}`);
    } catch (err) {
      console.error('Lỗi khi xóa người dùng:', err);
      setError('Không thể xóa người dùng. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Mở dialog gửi thông báo hàng loạt
  const handleOpenBulkNotificationDialog = () => {
    setNotificationData({
      title: '',
      message: '',
      sendEmail: true,
      recipients: 'all',
      selectedUsers: []
    });
    setOpenNotificationDialog(true);
  };

  // Xử lý thay đổi dữ liệu thông báo
  const handleNotificationChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === 'sendEmail') {
      setNotificationData({
        ...notificationData,
        sendEmail: checked
      });
    } else if (name === 'recipients') {
      setNotificationData({
        ...notificationData,
        recipients: value,
        selectedUsers: value === 'all' ? [] : notificationData.selectedUsers
      });
    } else {
      setNotificationData({
        ...notificationData,
        [name]: value
      });
    }
  };

  // Xử lý chọn người dùng trong danh sách
  const handleToggleUser = (userId) => {
    const selectedUsers = [...notificationData.selectedUsers];
    const currentIndex = selectedUsers.indexOf(userId);
    
    if (currentIndex === -1) {
      selectedUsers.push(userId);
    } else {
      selectedUsers.splice(currentIndex, 1);
    }
    
    setNotificationData({
      ...notificationData,
      selectedUsers
    });
  };

  // Gửi thông báo hàng loạt
  const handleSendBulkNotification = async () => {
    try {
      setLoading(true);
      
      const userIds = notificationData.recipients === 'all' 
        ? users.map(user => user._id) 
        : notificationData.selectedUsers;
      
      console.log('Request Data:', {
        userIds,
        title: notificationData.title,
        message: notificationData.message,
        sendEmail: false // Tạm thời vô hiệu hóa tính năng gửi email
      });
      
      await api.post(`admin/notifications/bulk-send`, {
        userIds,
        title: notificationData.title,
        message: notificationData.message,
        sendEmail: false // Tạm thời vô hiệu hóa tính năng gửi email
      });
      
      setOpenNotificationDialog(false);
      setSuccess(`Đã gửi thông báo tới ${userIds.length} người dùng thành công`);
    } catch (err) {
      console.log('API Response Error:', err);
      setError('Không thể gửi thông báo. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Box mt={3} mb={4} display="flex" justifyContent="space-between" alignItems="center">
          <div>
            <Typography variant="h4" component="h1" gutterBottom>
              Quản lý người dùng
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Xem và quản lý tài khoản người dùng trên hệ thống Smart Garden
            </Typography>
          </div>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={handleOpenBulkNotificationDialog}
          >
            Gửi thông báo hàng loạt
          </Button>
        </Box>

        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="flex-end" mb={3}>
            <IconButton onClick={loadUsers} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên người dùng</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Quyền</TableCell>
                      <TableCell>Đăng nhập gần nhất</TableCell>
                      <TableCell>Ngày đăng ký</TableCell>
                      <TableCell align="right">Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((user) => (
                        <TableRow key={user._id}>
                          <TableCell component="th" scope="row">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar src={user.avatar} sx={{ mr: 1, width: 32, height: 32 }}>
                                {user.fullname.charAt(0)}
                              </Avatar>
                              <Typography variant="body2">
                                {user.fullname}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.role === 'admin' ? (
                              <Chip 
                                icon={<AdminIcon />} 
                                label="Admin" 
                                color="error" 
                                variant="outlined"
                                size="small"
                              />
                            ) : (
                              <Chip 
                                icon={<PersonIcon />} 
                                label="Người dùng" 
                                color="primary" 
                                variant="outlined"
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {user.last_login ? new Date(user.last_login).toLocaleString('vi-VN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Chưa từng đăng nhập'}
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('vi-VN')}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Xem chi tiết">
                              <IconButton 
                                size="small" 
                                component={Link} 
                                to={`/admin/users/${user._id}`} 
                                color="primary"
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Thay đổi quyền">
                              <IconButton 
                                size="small" 
                                onClick={() => handleOpenRoleDialog(user)} 
                                color="secondary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            {user.role !== 'admin' && (
                              <Tooltip title="Xóa người dùng">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleOpenDeleteDialog(user)} 
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body1" sx={{ py: 3 }}>
                            Không có người dùng nào
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={users.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Dòng trên trang"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
              />
            </>
          )}
        </Paper>

        {/* Dialog thay đổi quyền */}
        <Dialog open={openRoleDialog} onClose={() => setOpenRoleDialog(false)}>
          <DialogTitle>Thay đổi quyền cho người dùng</DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box mt={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Người dùng: <strong>{selectedUser.fullname}</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Email: {selectedUser.email}
                </Typography>
                <Box mt={3} display="flex" alignItems="center">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedUser.role === 'admin'}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          role: e.target.checked ? 'admin' : 'user'
                        })}
                        color="primary"
                      />
                    }
                    label={selectedUser.role === 'admin' ? 'Admin' : 'User'}
                  />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRoleDialog(false)}>Hủy</Button>
            <Button onClick={handleUpdateRole} variant="contained" color="primary">
              Lưu thay đổi
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog xóa người dùng */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle>Xác nhận xóa người dùng</DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box mt={2}>
                <Typography variant="body1" gutterBottom>
                  Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser.fullname}</strong>?
                </Typography>
                <Typography variant="body2" color="error" gutterBottom>
                  Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu của người dùng này.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Hủy</Button>
            <Button onClick={handleDeleteUser} variant="contained" color="error">
              Xóa người dùng
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog gửi thông báo hàng loạt */}
        <Dialog open={openNotificationDialog} onClose={() => setOpenNotificationDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Gửi thông báo hàng loạt</DialogTitle>
          <DialogContent>
            <Box mt={2}>
              <TextField
                margin="normal"
                fullWidth
                label="Tiêu đề thông báo"
                name="title"
                value={notificationData.title}
                onChange={handleNotificationChange}
                required
              />
              <TextField
                margin="normal"
                fullWidth
                label="Nội dung thông báo"
                name="message"
                value={notificationData.message}
                onChange={handleNotificationChange}
                required
                multiline
                rows={4}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationData.sendEmail}
                    onChange={handleNotificationChange}
                    name="sendEmail"
                    color="primary"
                  />
                }
                label="Đồng thời gửi email tới người dùng"
              />
              
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Người nhận:
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationData.recipients === 'all'}
                    onChange={(e) => handleNotificationChange({
                      target: {
                        name: 'recipients',
                        value: e.target.checked ? 'all' : 'selected'
                      }
                    })}
                    color="primary"
                  />
                }
                label="Gửi đến tất cả người dùng"
              />
              
              {notificationData.recipients === 'selected' && (
                <Box mt={2} maxHeight={300} overflow="auto" border="1px solid #eee" borderRadius={1} p={1}>
                  <List dense>
                    {users.map((user) => (
                      <ListItem 
                        key={user._id}
                        button 
                        onClick={() => handleToggleUser(user._id)}
                      >
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={notificationData.selectedUsers.indexOf(user._id) !== -1}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={user.fullname} 
                          secondary={user.email} 
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Box mt={1} display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="textSecondary">
                      Đã chọn: {notificationData.selectedUsers.length} người dùng
                    </Typography>
                    <Button 
                      size="small" 
                      onClick={() => setNotificationData({
                        ...notificationData,
                        selectedUsers: users.map(u => u._id)
                      })}
                    >
                      Chọn tất cả
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNotificationDialog(false)}>Hủy</Button>
            <Button 
              onClick={handleSendBulkNotification} 
              variant="contained" 
              color="primary"
              disabled={!notificationData.title || !notificationData.message || 
                (notificationData.recipients === 'selected' && notificationData.selectedUsers.length === 0)}
            >
              Gửi thông báo
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AdminLayout>
  );
};

export default UserManagement; 
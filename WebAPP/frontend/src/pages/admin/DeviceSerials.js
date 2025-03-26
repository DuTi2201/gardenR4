import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, CircularProgress, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, Tooltip, Divider, Grid, FormControl, InputLabel, Select, MenuItem, Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import AdminLayout from '../../components/layouts/AdminLayout';

const DeviceSerials = () => {
  const [deviceSerials, setDeviceSerials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState('all');
  const [forceDeleteMode, setForceDeleteMode] = useState(false);

  // Form data cho thêm một serial
  const [serialForm, setSerialForm] = useState({
    serial: '',
    camera_serial: '',
    notes: ''
  });

  // Form data cho sửa serial
  const [editForm, setEditForm] = useState({
    serial: '',
    camera_serial: '',
    notes: '',
    is_activated: false
  });

  // Form data cho thêm hàng loạt
  const [batchForm, setBatchForm] = useState({
    prefix: 'GARDEN',
    startNumber: '1',
    count: '10',
    serials: ''
  });

  // Load danh sách device serials
  const loadDeviceSerials = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching device serials data...");
      const response = await api.get('/admin/device-serials');
      console.log("Device serials API response:", response.data);
      setDeviceSerials(response.data.data);
    } catch (err) {
      console.error('Error loading device serials:', err);
      setError('Không thể tải danh sách mã thiết bị. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeviceSerials();
  }, []);

  // Handle input change
  const handleInputChange = (e, formType) => {
    const { name, value } = e.target;
    if (formType === 'single') {
      setSerialForm({
        ...serialForm,
        [name]: value
      });
    } else if (formType === 'batch') {
      setBatchForm({
        ...batchForm,
        [name]: value
      });
    } else if (formType === 'edit') {
      setEditForm({
        ...editForm,
        [name]: value
      });
    }
  };

  // Add a single device serial
  const handleAddDeviceSerial = async () => {
    try {
      setLoading(true);
      const response = await api.post('/admin/device-serials', serialForm);
      setDeviceSerials([response.data.data, ...deviceSerials]);
      setOpenAddDialog(false);
      setSerialForm({ serial: '', camera_serial: '', notes: '' });
      setSuccess('Thêm mã thiết bị thành công');
    } catch (err) {
      setError('Không thể thêm mã thiết bị. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Add batch device serials
  const handleAddBatchSerials = async () => {
    try {
      setLoading(true);
      const payload = { ...batchForm };
      
      // Nếu có nhập danh sách serials
      if (batchForm.serials.trim()) {
        payload.serials = batchForm.serials.split('\n').filter(s => s.trim());
      }
      
      const response = await api.post('/admin/device-serials/batch', payload);
      setDeviceSerials([...response.data.data, ...deviceSerials]);
      setOpenBatchDialog(false);
      setBatchForm({ prefix: 'GARDEN', startNumber: '1', count: '10', serials: '' });
      setSuccess(`Đã thêm ${response.data.count} mã thiết bị thành công`);
    } catch (err) {
      setError('Không thể thêm hàng loạt mã thiết bị. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Edit device serial
  const handleEditClick = (serial) => {
    setEditTarget(serial);
    setEditForm({
      serial: serial.serial,
      camera_serial: serial.camera_serial || '',
      notes: serial.notes || '',
      is_activated: serial.is_activated
    });
    setOpenEditDialog(true);
  };

  const handleUpdateDeviceSerial = async () => {
    try {
      setLoading(true);
      const response = await api.put(`/admin/device-serials/${editTarget._id}`, editForm);
      setDeviceSerials(deviceSerials.map(s => s._id === editTarget._id ? response.data.data : s));
      setOpenEditDialog(false);
      setSuccess('Đã cập nhật mã thiết bị thành công');
    } catch (err) {
      setError('Không thể cập nhật mã thiết bị. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete device serial
  const confirmDelete = (serial) => {
    setDeleteTarget(serial);
    setForceDeleteMode(false);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDeviceSerial = async () => {
    try {
      setLoading(true);
      let url = `/admin/device-serials/${deleteTarget._id}`;
      if (forceDeleteMode) {
        url += '?force=true';
      }
      
      console.log('Gửi request DELETE tới:', url);
      const response = await api.delete(url);
      console.log('Response xóa mã thiết bị:', response.data);
      
      setDeviceSerials(deviceSerials.filter(s => s._id !== deleteTarget._id));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setSuccess('Đã xóa mã thiết bị thành công');
    } catch (err) {
      console.error('Lỗi xóa mã thiết bị:', err);
      console.error('Chi tiết lỗi:', err.response?.data || err.message);
      
      if (err.response?.status === 400 && err.response?.data?.message?.includes('đã được kích hoạt')) {
        setError('Mã thiết bị đã được kích hoạt. Bạn có thể dùng xóa bắt buộc để xóa cả kết nối với vườn.');
        setForceDeleteMode(true);
      } else {
        setError('Không thể xóa mã thiết bị. ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter device serials
  const filteredDeviceSerials = deviceSerials.filter(serial => {
    if (filter === 'all') return true;
    if (filter === 'activated') return serial.is_activated;
    if (filter === 'not_activated') return !serial.is_activated;
    return true;
  });

  // Hiển thị snackbar cho thông báo thành công/lỗi
  const handleCloseSnackbar = () => {
    setSuccess(null);
    setError(null);
  };

  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Box mt={3} mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Quản lý mã thiết bị
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Quản lý mã serial của các thiết bị Arduino và Camera
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddDialog(true)}
                sx={{ mr: 2 }}
              >
                Thêm mã thiết bị
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenBatchDialog(true)}
              >
                Thêm hàng loạt
              </Button>
            </Box>
            <Box display="flex" alignItems="center">
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150, mr: 2 }}>
                <InputLabel>Lọc trạng thái</InputLabel>
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  label="Lọc trạng thái"
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="activated">Đã kích hoạt</MenuItem>
                  <MenuItem value="not_activated">Chưa kích hoạt</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={loadDeviceSerials} color="primary">
                <RefreshIcon />
              </IconButton>
            </Box>
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
                      <TableCell>Mã thiết bị</TableCell>
                      <TableCell>Mã Camera</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell>Kích hoạt bởi</TableCell>
                      <TableCell>Ngày kích hoạt</TableCell>
                      <TableCell>Ghi chú</TableCell>
                      <TableCell align="right">Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDeviceSerials
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((serial) => (
                        <TableRow key={serial._id}>
                          <TableCell component="th" scope="row">
                            <Typography variant="body2" fontWeight="bold">
                              {serial.serial}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {serial.camera_serial || '-'}
                          </TableCell>
                          <TableCell>
                            {serial.is_activated ? (
                              <Chip
                                label="Đã kích hoạt"
                                color="success"
                                size="small"
                                icon={<CheckIcon />}
                              />
                            ) : (
                              <Chip
                                label="Chưa kích hoạt"
                                color="default"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {serial.activated_by ? (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar
                                  src={serial.activated_by.avatar}
                                  sx={{ width: 30, height: 30, mr: 1 }}
                                >
                                  {serial.activated_by.fullname ? serial.activated_by.fullname.charAt(0) : '?'}
                                </Avatar>
                                <Typography variant="body2">
                                  {serial.activated_by.fullname || 'Không rõ'}
                                </Typography>
                              </Box>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {serial.activation_date
                              ? new Date(serial.activation_date).toLocaleDateString('vi-VN')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {serial.notes || '-'}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Sửa">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditClick(serial)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => confirmDelete(serial)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredDeviceSerials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body1" sx={{ py: 3 }}>
                            Không có mã thiết bị nào
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
                count={filteredDeviceSerials.length}
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

        {/* Dialog thêm mã thiết bị */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Thêm mã thiết bị mới</DialogTitle>
          <DialogContent>
            <Box my={2}>
              <TextField
                fullWidth
                label="Mã thiết bị"
                name="serial"
                variant="outlined"
                value={serialForm.serial}
                onChange={(e) => handleInputChange(e, 'single')}
                margin="normal"
                required
                helperText="Nhập mã thiết bị Arduino (VD: GARDEN1001)"
              />
              <TextField
                fullWidth
                label="Mã Camera (tùy chọn)"
                name="camera_serial"
                variant="outlined"
                value={serialForm.camera_serial}
                onChange={(e) => handleInputChange(e, 'single')}
                margin="normal"
                helperText="Nhập mã camera nếu có (VD: CAM1001)"
              />
              <TextField
                fullWidth
                label="Ghi chú"
                name="notes"
                variant="outlined"
                value={serialForm.notes}
                onChange={(e) => handleInputChange(e, 'single')}
                margin="normal"
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)} color="inherit">
              Hủy
            </Button>
            <Button 
              onClick={handleAddDeviceSerial} 
              color="primary" 
              variant="contained"
              disabled={!serialForm.serial}
            >
              Thêm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog sửa mã thiết bị */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Sửa mã thiết bị</DialogTitle>
          <DialogContent>
            <Box my={2}>
              <TextField
                fullWidth
                label="Mã thiết bị"
                name="serial"
                variant="outlined"
                value={editForm.serial}
                onChange={(e) => handleInputChange(e, 'edit')}
                margin="normal"
                required
                helperText="Nhập mã thiết bị Arduino (VD: GARDEN1001)"
              />
              <TextField
                fullWidth
                label="Mã Camera (tùy chọn)"
                name="camera_serial"
                variant="outlined"
                value={editForm.camera_serial}
                onChange={(e) => handleInputChange(e, 'edit')}
                margin="normal"
                helperText="Nhập mã camera nếu có (VD: CAM1001)"
              />
              <TextField
                fullWidth
                label="Ghi chú"
                name="notes"
                variant="outlined"
                value={editForm.notes}
                onChange={(e) => handleInputChange(e, 'edit')}
                margin="normal"
                multiline
                rows={3}
              />
              {editForm.is_activated && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Chú ý: Mã thiết bị này đã được kích hoạt. Việc thay đổi mã serial có thể ảnh hưởng 
                  đến kết nối với vườn của người dùng.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)} color="inherit">
              Hủy
            </Button>
            <Button 
              onClick={handleUpdateDeviceSerial} 
              color="primary" 
              variant="contained"
              disabled={!editForm.serial}
            >
              Cập nhật
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog thêm hàng loạt mã thiết bị */}
        <Dialog open={openBatchDialog} onClose={() => setOpenBatchDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Thêm hàng loạt mã thiết bị</DialogTitle>
          <DialogContent>
            <Box my={2}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Tạo tự động theo mẫu
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Tiền tố"
                    name="prefix"
                    variant="outlined"
                    value={batchForm.prefix}
                    onChange={(e) => handleInputChange(e, 'batch')}
                    helperText="Ví dụ: GARDEN"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Bắt đầu từ số"
                    name="startNumber"
                    variant="outlined"
                    type="number"
                    value={batchForm.startNumber}
                    onChange={(e) => handleInputChange(e, 'batch')}
                    helperText="Ví dụ: 1"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Số lượng"
                    name="count"
                    variant="outlined"
                    type="number"
                    value={batchForm.count}
                    onChange={(e) => handleInputChange(e, 'batch')}
                    helperText="Ví dụ: 10"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Hoặc nhập danh sách mã thiết bị
                  </Typography>
                  <TextField
                    fullWidth
                    label="Danh sách mã thiết bị"
                    name="serials"
                    variant="outlined"
                    value={batchForm.serials}
                    onChange={(e) => handleInputChange(e, 'batch')}
                    multiline
                    rows={6}
                    helperText="Mỗi dòng một mã thiết bị"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBatchDialog(false)} color="inherit">
              Hủy
            </Button>
            <Button onClick={handleAddBatchSerials} color="primary" variant="contained">
              Thêm hàng loạt
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog xác nhận xóa */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogContent>
            {deleteTarget && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Bạn có chắc chắn muốn xóa mã thiết bị <strong>{deleteTarget.serial}</strong>?
                </Typography>
                {deleteTarget.is_activated && forceDeleteMode && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Mã thiết bị này đã được kích hoạt bởi người dùng và đang được sử dụng.
                    Xóa bắt buộc sẽ xóa mã này khỏi hệ thống và có thể gây mất kết nối với vườn của người dùng.
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
              Hủy
            </Button>
            <Button onClick={handleDeleteDeviceSerial} color="error" variant="contained">
              {forceDeleteMode ? 'Xóa bắt buộc' : 'Xóa'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar thông báo */}
        <Snackbar 
          open={Boolean(success || error)} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={success ? "success" : "error"} 
            elevation={6} 
            variant="filled"
          >
            {success || error}
          </Alert>
        </Snackbar>
      </Container>
    </AdminLayout>
  );
};

export default DeviceSerials; 
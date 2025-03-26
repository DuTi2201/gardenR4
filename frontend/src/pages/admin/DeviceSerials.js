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
  Close as CloseIcon
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState('all');

  // Form data cho thêm một serial
  const [serialForm, setSerialForm] = useState({
    serial: '',
    notes: ''
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
    }
  };

  // Add a single device serial
  const handleAddDeviceSerial = async () => {
    try {
      setLoading(true);
      const response = await api.post('/admin/device-serials', serialForm);
      setDeviceSerials([response.data.data, ...deviceSerials]);
      setOpenAddDialog(false);
      setSerialForm({ serial: '', notes: '' });
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

  // Delete device serial
  const confirmDelete = (serial) => {
    setDeleteTarget(serial);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDeviceSerial = async () => {
    try {
      setLoading(true);
      await api.delete(`/admin/device-serials/${deleteTarget._id}`);
      setDeviceSerials(deviceSerials.filter(s => s._id !== deleteTarget._id));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setSuccess('Đã xóa mã thiết bị thành công');
    } catch (err) {
      setError('Không thể xóa mã thiết bị. ' + (err.response?.data?.message || err.message));
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

  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Box mt={3} mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Quản lý mã thiết bị
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Quản lý mã serial của các thiết bị Arduino
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

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          ) : (
            <>
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Mã thiết bị</TableCell>
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
                                icon={<CloseIcon />}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {serial.activated_by ? (
                              <>
                                <Box display="flex" alignItems="center">
                                  <Avatar
                                    src={serial.activated_by.avatar}
                                    alt={serial.activated_by.fullname}
                                    sx={{ width: 24, height: 24, mr: 1 }}
                                  >
                                    {serial.activated_by.fullname.charAt(0)}
                                  </Avatar>
                                  <Typography variant="body2">
                                    {serial.activated_by.fullname}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="textSecondary">
                                  {serial.activated_by.email}
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {serial.activation_date ? (
                              <Typography variant="body2">
                                {new Date(serial.activation_date).toLocaleDateString('vi-VN')}
                                <Typography variant="caption" display="block" color="textSecondary">
                                  {new Date(serial.activation_date).toLocaleTimeString('vi-VN')}
                                </Typography>
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {serial.notes || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {serial.is_activated ? (
                              <Tooltip title="Xem thông tin người dùng">
                                <IconButton
                                  component={Link}
                                  to={`/admin/users/${serial.activated_by?._id}`}
                                  color="primary"
                                  size="small"
                                >
                                  <PersonIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <>
                                <Tooltip title="Chỉnh sửa">
                                  <IconButton color="primary" size="small">
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                  <IconButton
                                    color="error"
                                    size="small"
                                    onClick={() => confirmDelete(serial)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredDeviceSerials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
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

        {/* Thêm device serial dialog */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Thêm mã thiết bị mới</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="serial"
              label="Mã thiết bị"
              type="text"
              fullWidth
              variant="outlined"
              value={serialForm.serial}
              onChange={(e) => handleInputChange(e, 'single')}
              helperText="Định dạng mã: GARDENXXXX (ví dụ: GARDEN0001)"
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="notes"
              label="Ghi chú"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={serialForm.notes}
              onChange={(e) => handleInputChange(e, 'single')}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)} color="inherit">
              Hủy
            </Button>
            <Button 
              onClick={handleAddDeviceSerial} 
              color="primary" 
              variant="contained"
              disabled={!serialForm.serial.trim()}
            >
              Thêm mã thiết bị
            </Button>
          </DialogActions>
        </Dialog>

        {/* Thêm batch device serials dialog */}
        <Dialog open={openBatchDialog} onClose={() => setOpenBatchDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Thêm nhiều mã thiết bị</DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Phương thức 1: Tạo theo mẫu
                </Typography>
                <Box sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 2, my: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Hệ thống sẽ tự động tạo danh sách mã thiết bị theo định dạng PREFIX + NUMBER.
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      name="prefix"
                      label="Tiền tố"
                      type="text"
                      fullWidth
                      variant="outlined"
                      value={batchForm.prefix}
                      onChange={(e) => handleInputChange(e, 'batch')}
                      helperText="Ví dụ: GARDEN"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      name="startNumber"
                      label="Số bắt đầu"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={batchForm.startNumber}
                      onChange={(e) => handleInputChange(e, 'batch')}
                      helperText="Ví dụ: 1"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      name="count"
                      label="Số lượng"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={batchForm.count}
                      onChange={(e) => handleInputChange(e, 'batch')}
                      helperText="Ví dụ: 10"
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Phương thức 2: Nhập trực tiếp
                </Typography>
                <Box sx={{ borderLeft: '3px solid', borderColor: 'primary.main', pl: 2, my: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Nhập danh sách mã thiết bị, mỗi mã một dòng.
                  </Typography>
                </Box>
                <TextField
                  name="serials"
                  label="Danh sách mã thiết bị"
                  multiline
                  rows={5}
                  fullWidth
                  variant="outlined"
                  value={batchForm.serials}
                  onChange={(e) => handleInputChange(e, 'batch')}
                  placeholder="GARDEN0001
GARDEN0002
GARDEN0003"
                  helperText="Mỗi mã thiết bị trên một dòng"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBatchDialog(false)} color="inherit">
              Hủy
            </Button>
            <Button 
              onClick={handleAddBatchSerials} 
              color="primary" 
              variant="contained"
              disabled={(!batchForm.prefix || !batchForm.count || !batchForm.startNumber) && !batchForm.serials.trim()}
            >
              Thêm mã thiết bị
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogContent>
            <Typography>
              Bạn có chắc chắn muốn xóa mã thiết bị <b>{deleteTarget?.serial}</b>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Hủy</Button>
            <Button onClick={handleDeleteDeviceSerial} color="error" variant="contained">
              Xóa
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for success messages */}
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </Container>
    </AdminLayout>
  );
};

export default DeviceSerials; 
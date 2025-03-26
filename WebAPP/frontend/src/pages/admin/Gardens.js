import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Button, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, Chip, IconButton, Avatar, Card, CardContent, Grid
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminLayout from '../../components/layouts/AdminLayout';
import { useGarden } from '../../context/GardenContext';

const AdminGardens = () => {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const loadGardens = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching all gardens for admin...");
      const response = await api.get('/admin/gardens');
      console.log("Gardens API response:", response.data);
      setGardens(response.data.data || []);
    } catch (err) {
      console.error('Error loading gardens:', err);
      setError('Không thể tải danh sách vườn. ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGardens();
  }, []);

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <AdminLayout>
      <Container maxWidth="lg">
        <Box mt={3} mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Quản lý vườn
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Xem tất cả các vườn trong hệ thống
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Button
              component={Link}
              to="/admin"
              startIcon={<ArrowBackIcon />}
              color="primary"
            >
              Quay lại Dashboard
            </Button>
            <IconButton onClick={loadGardens} color="primary">
              <RefreshIcon />
            </IconButton>
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
                      <TableCell>Tên vườn</TableCell>
                      <TableCell>Người sở hữu</TableCell>
                      <TableCell>Thiết bị</TableCell>
                      <TableCell>Ngày tạo</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell align="right">Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gardens.length > 0 ? (
                      gardens
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((garden) => (
                          <TableRow key={garden._id}>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Typography variant="body1" fontWeight="bold">
                                  {garden.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Avatar sx={{ width: 30, height: 30, mr: 1 }}>
                                  <PersonIcon fontSize="small" />
                                </Avatar>
                                <Typography variant="body2">
                                  {garden.user_email || 'Không rõ'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={garden.device_serial || 'Chưa kết nối'}
                                color={garden.device_serial ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(garden.created_at).toLocaleDateString('vi-VN')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={garden.is_active ? 'Hoạt động' : 'Không hoạt động'}
                                color={garden.is_active ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton 
                                color="primary"
                                component={Link}
                                to={`/gardens/${garden._id}`}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body1" py={3}>
                            Không có vườn nào
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
                count={gardens.length}
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
      </Container>
    </AdminLayout>
  );
};

export default AdminGardens; 
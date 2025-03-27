// src/components/GardenDetail/GardenScheduleTab.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Divider, Alert, TableContainer, Paper, Table,
  TableHead, TableRow, TableCell, TableBody, Chip, IconButton, CircularProgress,
  Grid, Card, CardContent, useMediaQuery, useTheme
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Schedule as ScheduleIcon,
  AccessTime as AccessTimeIcon,
  PowerSettingsNew as PowerIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { scheduleService } from '../../services'; // Adjust path
import { useToast } from '../../context/ToastContext'; // Adjust path
import ScheduleDialog from './ScheduleDialog'; // Adjust path
import { getShortDayNameVi } from './utils/gardenUtils'; // Adjust path

const GardenScheduleTab = ({ gardenId }) => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState(null);
  const [error, setError] = useState(null); // Local error state for schedule operations
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const loadSchedules = useCallback(async () => {
    if (!gardenId) return;
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await scheduleService.getSchedules(gardenId);
      setSchedules(response?.data || response || []); // Handle both response structures
    } catch (err) {
      console.error('Error loading schedules:', err);
      setError('Không thể tải danh sách lịch trình.');
      setSchedules([]); // Ensure schedules is an array on error
      toast.error(err.response?.data?.message || 'Lỗi tải lịch trình.');
    } finally {
      setLoading(false);
    }
  }, [gardenId, toast]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleOpenDialog = (schedule = null) => {
    setScheduleToEdit(schedule);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setScheduleToEdit(null); // Clear edit state on close
  };

  const handleSaveSchedule = async (scheduleData) => {
     setError(null); // Clear previous errors
     const isEditing = Boolean(scheduleData._id);
     try {
       if (isEditing) {
         await scheduleService.updateSchedule(gardenId, scheduleData._id, scheduleData);
         toast.success('Cập nhật lịch trình thành công!');
       } else {
         await scheduleService.createSchedule(gardenId, scheduleData);
         toast.success('Tạo lịch trình mới thành công!');
       }
       handleCloseDialog();
       loadSchedules(); // Refresh list
     } catch (err) {
        console.error(`Error ${isEditing ? 'updating' : 'creating'} schedule:`, err);
        const message = err.response?.data?.message || `Không thể ${isEditing ? 'cập nhật' : 'tạo'} lịch trình.`;
        setError(message); // Set local error for display
        toast.error(message);
     }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch trình này?')) {
        return;
    }
    setError(null); // Clear previous errors
    try {
      await scheduleService.deleteSchedule(gardenId, scheduleId);
      toast.success('Xóa lịch trình thành công!');
      loadSchedules(); // Refresh list
    } catch (err) {
      console.error('Error deleting schedule:', err);
      const message = err.response?.data?.message || 'Không thể xóa lịch trình.';
      setError(message); // Set local error for display
      toast.error(message);
    }
  };

  const renderDeviceName = (device) => {
      switch (device) {
          case 'PUMP': return 'Máy bơm 1';
          case 'PUMP_2': return 'Máy bơm 2';
          case 'FAN': return 'Quạt';
          case 'LIGHT': return 'Đèn';
          default: return device;
      }
  };

  const renderDeviceIcon = (device) => {
    const iconStyle = { 
      color: 'var(--icon-color)', 
      fontSize: '1.2rem'
    };
    
    return <ScheduleIcon style={iconStyle} />;
  };

  // Render card view for mobile
  const renderScheduleCards = () => {
    return (
      <Grid container spacing={2}>
        {schedules.map((schedule) => (
          <Grid item xs={12} sm={6} md={4} key={schedule._id}>
            <Card className="device-card" sx={{ 
              height: '100%', 
              borderRadius: '16px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              background: 'var(--card-bg)',
              boxShadow: 'var(--card-shadow)',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 'var(--card-shadow-hover)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                      color: 'var(--icon-color)',
                      mr: 1.5 
                    }}>
                      {renderDeviceIcon(schedule.device)}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {renderDeviceName(schedule.device)}
                    </Typography>
                  </Box>
                  <Chip
                    label={schedule.active ? "Hoạt động" : "Tắt"}
                    color={schedule.active ? "primary" : "default"}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2, 
                  backgroundColor: 'rgba(76, 175, 80, 0.05)',
                  padding: '10px 15px',
                  borderRadius: '12px'
                }}>
                  <AccessTimeIcon sx={{ color: 'var(--icon-color)', mr: 1.5 }} />
                  <Typography variant="h5" fontWeight="600">
                    {String(schedule.hour).padStart(2, '0')}:{String(schedule.minute).padStart(2, '0')}
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    <Chip
                      label={schedule.action ? "BẬT" : "TẮT"}
                      color={schedule.action ? "success" : "error"}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Ngày trong tuần:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {schedule.days && Object.entries(schedule.days)
                      .filter(([_, value]) => value)
                      .map(([day]) => (
                        <Chip
                          key={day}
                          label={getShortDayNameVi(day)}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            mr: 0.5, 
                            mb: 0.5,
                            borderColor: 'var(--icon-color)',
                            color: 'var(--text-primary)',
                            fontWeight: 500
                          }}
                        />
                      ))}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(schedule)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteSchedule(schedule._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Render table view for desktop
  const renderScheduleTable = () => {
    return (
      <TableContainer component={Paper} sx={{ 
        borderRadius: '16px',
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: 'var(--card-shadow-hover)'
        }
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(76, 175, 80, 0.05)' }}>
              <TableCell sx={{ fontWeight: 600 }}>Thiết bị</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Hành động</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ngày trong tuần</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule._id} hover sx={{ '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.03)' } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                      color: 'var(--icon-color)',
                      mr: 1.5 
                    }}>
                      {renderDeviceIcon(schedule.device)}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {renderDeviceName(schedule.device)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {String(schedule.hour).padStart(2, '0')}:{String(schedule.minute).padStart(2, '0')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={schedule.action ? "BẬT" : "TẮT"}
                    color={schedule.action ? "success" : "error"}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {schedule.days && Object.entries(schedule.days)
                      .filter(([_, value]) => value)
                      .map(([day]) => (
                        <Chip
                          key={day}
                          label={getShortDayNameVi(day)}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            borderColor: 'var(--icon-color)',
                            color: 'var(--text-primary)',
                            fontWeight: 500
                          }}
                        />
                      ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={schedule.active ? "Hoạt động" : "Tắt"}
                    color={schedule.active ? "primary" : "default"}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(schedule)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteSchedule(schedule._id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--card-gradient-start) 0%, var(--card-gradient-end) 100%)',
          boxShadow: 'var(--card-shadow)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: 'var(--card-shadow-hover)'
          }
        }}
        className="garden-card"
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EventIcon sx={{ fontSize: 28, mr: 1.5, color: 'primary.main' }} />
              <Typography variant="h5" sx={{ 
                fontWeight: 600, 
                color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit'
              }}>
                Quản lý lịch trình
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ 
                borderRadius: '12px',
                py: 1,
                px: 2,
                fontWeight: 600,
                boxShadow: 'var(--button-shadow)',
                '&:hover': {
                  boxShadow: 'var(--button-shadow-hover)',
                  transform: 'translateY(-2px)'
                },
                textTransform: 'none',
                fontSize: '0.95rem',
                transition: 'all 0.3s ease',
                color: (theme) => theme.palette.mode === 'dark' ? '#fff' : undefined
              }}
            >
              Thêm lịch trình mới
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 3, opacity: 0.7 }} />

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: '12px',
              '& .MuiAlert-icon': {
                color: '#f44336'
              }
            }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: 'var(--icon-color)' }} />
          </Box>
        ) : schedules.length === 0 ? (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              borderRadius: '12px',
              '& .MuiAlert-icon': {
                color: 'var(--icon-color)'
              }
            }}
          >
            Chưa có lịch trình nào.
          </Alert>
        ) : (
          <>
            {isMobile ? renderScheduleCards() : renderScheduleTable()}
          </>
        )}

        <ScheduleDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSaveSchedule}
          scheduleToEdit={scheduleToEdit}
        />
      </Paper>
    </Box>
  );
};

export default GardenScheduleTab;
// src/components/GardenDetail/ScheduleDialog.js
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  FormControlLabel, Switch, Typography, Box, Chip, IconButton, Divider, Grid
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  PowerSettingsNew as PowerIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { getDayNameVi } from './utils/gardenUtils'; // Adjust path if needed

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const initialScheduleState = {
  device: 'PUMP',
  hour: 8,
  minute: 0,
  action: true,
  active: true,
  days: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true
  }
};

const ScheduleDialog = ({ open, onClose, onSave, scheduleToEdit }) => {
  const [schedule, setSchedule] = useState(initialScheduleState);
  const isEditing = Boolean(scheduleToEdit);

  useEffect(() => {
    if (isEditing && scheduleToEdit) {
      // Ensure days object exists and has all days
      const initialDays = daysOfWeek.reduce((acc, day) => {
          acc[day] = scheduleToEdit.days?.[day] || false; // Default to false if day is missing
          return acc;
      }, {});
      setSchedule({ ...scheduleToEdit, days: initialDays });
    } else {
      setSchedule(initialScheduleState);
    }
  }, [scheduleToEdit, isEditing, open]); // Reset when dialog opens or edit mode changes

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSchedule(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
     setSchedule(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleDayChange = (day) => {
    setSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: !prev.days[day]
      }
    }));
  };

  const handleSaveClick = () => {
    // Basic validation (optional)
    if (schedule.hour < 0 || schedule.hour > 23 || schedule.minute < 0 || schedule.minute > 59) {
        alert("Giờ hoặc phút không hợp lệ.");
        return;
    }
    onSave(schedule);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: 'var(--card-shadow)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '20px 24px',
        background: 'linear-gradient(135deg, var(--card-gradient-start) 0%, var(--card-gradient-end) 100%)'
      }}>
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
            mr: 2 
          }}>
            <ScheduleIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {isEditing ? 'Chỉnh sửa lịch trình' : 'Thêm lịch trình mới'}
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{ 
            bgcolor: 'rgba(0, 0, 0, 0.05)', 
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' } 
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ padding: '24px', paddingTop: '16px' }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <DeviceIcon />
              <Typography variant="subtitle1" fontWeight="600" sx={{ ml: 1 }}>
                Thiết bị
              </Typography>
            </Box>
            <TextField
              fullWidth
              select
              name="device"
              value={schedule.device}
              onChange={handleInputChange}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&:hover fieldset': {
                    borderColor: 'var(--icon-color)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--icon-color)',
                  },
                }
              }}
            >
              <MenuItem value="PUMP">Máy bơm 1</MenuItem>
              <MenuItem value="PUMP_2">Máy bơm 2</MenuItem>
              <MenuItem value="FAN">Quạt</MenuItem>
              <MenuItem value="LIGHT">Đèn</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon sx={{ color: 'var(--icon-color)' }} />
              <Typography variant="subtitle1" fontWeight="600" sx={{ ml: 1 }}>
                Thời gian
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Giờ"
                type="number"
                name="hour"
                value={schedule.hour}
                onChange={handleInputChange}
                inputProps={{ min: 0, max: 23 }}
                sx={{ 
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': {
                      borderColor: 'var(--icon-color)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--icon-color)',
                    },
                  }
                }}
              />
              <TextField
                label="Phút"
                type="number"
                name="minute"
                value={schedule.minute}
                onChange={handleInputChange}
                inputProps={{ min: 0, max: 59 }}
                sx={{ 
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&:hover fieldset': {
                      borderColor: 'var(--icon-color)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--icon-color)',
                    },
                  }
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PowerIcon sx={{ color: 'var(--icon-color)' }} />
              <Typography variant="subtitle1" fontWeight="600" sx={{ ml: 1 }}>
                Hành động
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', mb: 3, gap: 2 }}>
              <Button
                variant={schedule.action ? "contained" : "outlined"}
                onClick={() => setSchedule(prev => ({ ...prev, action: true }))}
                fullWidth
                sx={{ 
                  borderRadius: '12px',
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: schedule.action ? 'var(--button-shadow)' : 'none',
                  '&:hover': {
                    boxShadow: schedule.action ? 'var(--button-shadow-hover)' : 'none',
                    transform: schedule.action ? 'translateY(-2px)' : 'none',
                  },
                }}
              >
                BẬT thiết bị
              </Button>
              <Button
                variant={!schedule.action ? "contained" : "outlined"}
                color="error"
                onClick={() => setSchedule(prev => ({ ...prev, action: false }))}
                fullWidth
                sx={{ 
                  borderRadius: '12px',
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: !schedule.action ? '0 4px 10px rgba(244, 67, 54, 0.25)' : 'none',
                  '&:hover': {
                    boxShadow: !schedule.action ? '0 6px 15px rgba(244, 67, 54, 0.3)' : 'none',
                    transform: !schedule.action ? 'translateY(-2px)' : 'none',
                  },
                }}
              >
                TẮT thiết bị
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              py: 1.5,
              px: 2,
              mb: 3,
              backgroundColor: schedule.active ? 'rgba(76, 175, 80, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              borderRadius: '12px',
              border: '1px solid',
              borderColor: schedule.active ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease'
            }}>
              <Typography variant="subtitle1" fontWeight="500">
                Kích hoạt lịch trình
              </Typography>
              <Switch
                checked={schedule.active}
                onChange={handleSwitchChange}
                name="active"
                sx={{ 
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'var(--icon-color)',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'var(--icon-color)',
                  }
                }}
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarIcon sx={{ color: 'var(--icon-color)' }} />
              <Typography variant="subtitle1" fontWeight="600" sx={{ ml: 1 }}>
                Các ngày trong tuần
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              p: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: '12px'
            }}>
              {daysOfWeek.map((day) => (
                <Chip
                  key={day}
                  label={getDayNameVi(day)}
                  color={schedule.days[day] ? "primary" : "default"}
                  onClick={() => handleDayChange(day)}
                  variant={schedule.days[day] ? "filled" : "outlined"}
                  clickable
                  sx={{ 
                    fontWeight: 600,
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    transform: schedule.days[day] ? 'scale(1.05)' : 'scale(1)',
                    '& .MuiChip-label': {
                      px: 1.5
                    }
                  }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ padding: '16px 24px' }}>
        <Button 
          onClick={onClose}
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '10px',
          }}
        >
          Hủy
        </Button>
        <Button 
          onClick={handleSaveClick} 
          variant="contained"
          sx={{ 
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '10px',
            boxShadow: 'var(--button-shadow)',
            '&:hover': {
              boxShadow: 'var(--button-shadow-hover)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.3s ease',
            px: 3
          }}
        >
          {isEditing ? 'Lưu thay đổi' : 'Tạo lịch trình'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DeviceIcon = () => (
  <Box
    component="span"
    sx={{
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--icon-color)'
    }}
  >
    <ScheduleIcon />
  </Box>
);

export default ScheduleDialog;
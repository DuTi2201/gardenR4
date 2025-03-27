// src/components/GardenDetail/GardenControlTab.js
import React from 'react';
import {
  Box, Typography, Divider, FormControlLabel, Switch, Grid, Alert, CircularProgress, Paper
} from '@mui/material';
import DeviceControlCard from './DeviceControlCard'; // Adjust path
import AutoModeIcon from '@mui/icons-material/AutoMode';

const GardenControlTab = ({ deviceStates, deviceLoading, handleDeviceControl, handleAutoModeToggle }) => {
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
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit' }}>
          Điều khiển thiết bị
        </Typography>
        <Divider sx={{ mb: 3, opacity: 0.7 }} />

        <Box className="auto-mode-switch" sx={{ 
          mb: 3, 
          position: 'relative',
          p: 2,
          borderRadius: '16px',
          backgroundColor: deviceStates.auto ? 'rgba(76, 175, 80, 0.1)' : 'rgba(224, 224, 224, 0.1)',
          border: '1px solid',
          borderColor: deviceStates.auto ? 'rgba(76, 175, 80, 0.2)' : 'rgba(224, 224, 224, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          {deviceLoading.auto && (
            <Box
              sx={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(3px)',
                backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                zIndex: 1, 
                borderRadius: '16px'
              }}
            >
              <CircularProgress size={24} sx={{ color: 'var(--icon-color)' }} />
            </Box>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(76, 175, 80, 0.1)', 
              color: 'var(--icon-color)',
              mr: 2 
            }}>
              <AutoModeIcon />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit' }}>
              Chế độ tự động
            </Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={deviceStates.auto}
                onChange={handleAutoModeToggle}
                color="primary"
                disabled={deviceLoading.auto}
                sx={{ 
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'var(--icon-color)',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'var(--icon-color)',
                  }
                }}
              />
            }
            label={
              <Typography variant="body1" sx={{ 
                fontWeight: 500, 
                color: (theme) => {
                  if (theme.palette.mode === 'dark') return '#fff';
                  return deviceStates.auto ? 'var(--icon-color)' : 'var(--text-secondary)';
                }
              }}>
                {deviceStates.auto ? 'Đang bật' : 'Đang tắt'}
              </Typography>
            }
          />
          
          {deviceStates.auto && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: '10px',
                  '& .MuiAlert-icon': {
                    color: 'var(--icon-color)',
                  }
                }}
              >
                Chế độ tự động đang bật. Các thiết bị sẽ tự động điều chỉnh theo điều kiện môi trường và lịch trình.
              </Alert>
            </Box>
          )}
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <DeviceControlCard
              title="Quạt"
              deviceId="FAN"
              category="FAN"
              status={deviceStates.fan}
              isLoading={deviceLoading.fan}
              isAutoMode={deviceStates.auto}
              onControl={handleDeviceControl}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DeviceControlCard
              title="Đèn"
              deviceId="LIGHT"
              category="LIGHT"
              status={deviceStates.light}
              isLoading={deviceLoading.light}
              isAutoMode={deviceStates.auto}
              onControl={handleDeviceControl}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DeviceControlCard
              title="Máy bơm 1"
              deviceId="PUMP"
              category="PUMP"
              status={deviceStates.pump}
              isLoading={deviceLoading.pump}
              isAutoMode={deviceStates.auto}
              onControl={handleDeviceControl}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DeviceControlCard
              title="Máy bơm 2"
              deviceId="PUMP_2"
              category="PUMP_2"
              status={deviceStates.pump2}
              isLoading={deviceLoading.pump2}
              isAutoMode={deviceStates.auto}
              onControl={handleDeviceControl}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default GardenControlTab;
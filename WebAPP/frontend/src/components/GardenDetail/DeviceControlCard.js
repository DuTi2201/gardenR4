// src/components/GardenDetail/DeviceControlCard.js
import React from 'react';
import {
  Card, CardContent, CardActions, Typography, Button, Box, CircularProgress
} from '@mui/material';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import OpacityIcon from '@mui/icons-material/Opacity';
import BoltIcon from '@mui/icons-material/Bolt';

const DeviceControlCard = ({
  title,
  deviceId,
  category,
  status,
  isLoading,
  isAutoMode,
  onControl
}) => {
  // Xác định biểu tượng dựa trên loại thiết bị
  const getDeviceIcon = () => {
    switch (category) {
      case 'FAN':
        return <AcUnitIcon fontSize="large" />;
      case 'LIGHT':
        return <WbSunnyIcon fontSize="large" />;
      case 'PUMP':
      case 'PUMP_2':
        return <OpacityIcon fontSize="large" />;
      default:
        return <BoltIcon fontSize="large" />;
    }
  };

  return (
    <Card className="device-card" sx={{ 
      position: 'relative', 
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
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            zIndex: 2,
            borderRadius: '16px'
          }}
        >
          <CircularProgress sx={{ color: 'var(--icon-color)' }} />
        </Box>
      )}
      <CardContent sx={{ p: 3, textAlign: 'center' }}>
        <Box className="device-icon" sx={{ color: 'var(--icon-color)', mb: 2 }}>
          {getDeviceIcon()}
        </Box>
        <Typography className="device-title" variant="h6" sx={{ mb: 1, fontWeight: 600, color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'inherit' }}>
          {title}
        </Typography>
        <Box sx={{ 
          display: 'inline-block',
          py: 0.5, 
          px: 2,
          borderRadius: '20px',
          mb: 2,
          backgroundColor: status ? 'rgba(76, 175, 80, 0.1)' : 'rgba(224, 224, 224, 0.3)',
          color: (theme) => {
            if (theme.palette.mode === 'dark') return '#fff';
            return status ? 'var(--icon-color)' : 'var(--text-secondary)';
          }
        }}>
          <Typography className="device-status" variant="body2" sx={{ fontWeight: 600 }}>
            {status ? 'ĐANG BẬT' : 'ĐANG TẮT'}
          </Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
        <Button
          className="device-button device-button-on"
          size="medium"
          variant="contained"
          color="primary"
          disabled={isAutoMode || status || isLoading}
          onClick={() => onControl({ device_id: deviceId, category: category }, true)}
          fullWidth
          sx={{ 
            borderRadius: '12px',
            py: 1,
            fontWeight: 600,
            background: status ? 'var(--button-on-start)' : undefined,
            opacity: isAutoMode || status ? 1 : 0.9,
            color: (theme) => theme.palette.mode === 'dark' ? '#fff' : undefined
          }}
        >
          BẬT
        </Button>
        <Button
          className="device-button device-button-off"
          size="medium"
          variant="outlined"
          disabled={isAutoMode || !status || isLoading}
          onClick={() => onControl({ device_id: deviceId, category: category }, false)}
          fullWidth
          sx={{ 
            borderRadius: '12px',
            py: 1,
            fontWeight: 600,
            borderColor: 'var(--button-off-border)',
            color: (theme) => theme.palette.mode === 'dark' ? '#fff' : 'var(--button-off-text)'
          }}
        >
          TẮT
        </Button>
      </CardActions>
    </Card>
  );
};

export default DeviceControlCard;
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';

/**
 * Component hiển thị trạng thái kết nối của thiết bị Arduino
 * 
 * @param {Object} props - Props của component
 * @param {boolean} props.isConnected - Trạng thái kết nối (true: online, false: offline)
 * @param {Date} props.lastConnected - Thời gian kết nối cuối cùng
 * @param {string} props.size - Kích thước của đèn trạng thái ('small', 'medium', 'large')
 * @param {boolean} props.showText - Hiển thị chữ "Online"/"Offline" kèm theo đèn
 * @param {string} props.variant - Kiểu hiển thị ('badge', 'dot', 'text-badge')
 */
const ConnectionStatus = ({ 
  isConnected = false, 
  lastConnected = null,
  size = 'medium',
  showText = true,
  variant = 'badge' // 'badge', 'dot', 'text-badge'
}) => {
  // Xác định kích thước dot theo prop size
  const dotSizes = {
    small: 8,
    medium: 12,
    large: 16
  };

  const dotSize = dotSizes[size] || dotSizes.medium;
  
  // Tạo tooltip text với thông tin kết nối cuối cùng
  const getTooltipText = () => {
    if (isConnected) {
      return 'Thiết bị đang kết nối';
    }
    
    if (lastConnected) {
      return `Thiết bị offline. Kết nối cuối: ${new Date(lastConnected).toLocaleString('vi-VN')}`;
    }
    
    return 'Chưa từng kết nối';
  };

  // Render theo variant
  const renderVariant = () => {
    switch (variant) {
      case 'dot':
        return (
          <Box
            sx={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4caf50' : '#f44336',
              boxShadow: isConnected 
                ? '0 0 5px 1px rgba(76, 175, 80, 0.7)' 
                : '0 0 5px 1px rgba(244, 67, 54, 0.7)',
              transition: 'all 0.3s ease',
            }}
          />
        );
      
      case 'text-badge':
        return (
          <Typography
            variant="body2"
            sx={{
              display: 'inline-block',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 'bold',
              backgroundColor: isConnected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
              color: isConnected ? '#4caf50' : '#f44336',
              border: `1px solid ${isConnected ? '#4caf50' : '#f44336'}`,
            }}
          >
            {isConnected ? 'Online' : 'Offline'}
          </Typography>
        );
      
      case 'badge':
      default:
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4caf50' : '#f44336',
                boxShadow: isConnected 
                  ? '0 0 5px 1px rgba(76, 175, 80, 0.7)' 
                  : '0 0 5px 1px rgba(244, 67, 54, 0.7)',
                transition: 'all 0.3s ease',
                mr: showText ? 0.75 : 0
              }}
            />
            {showText && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  color: isConnected ? '#4caf50' : '#f44336'
                }}
              >
                {isConnected ? 'Online' : 'Offline'}
              </Typography>
            )}
          </Box>
        );
    }
  };

  return (
    <Tooltip title={getTooltipText()} arrow placement="top">
      {renderVariant()}
    </Tooltip>
  );
};

export default ConnectionStatus; 
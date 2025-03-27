import React, { useCallback, memo, useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useMascot } from './MascotContext';

/**
 * Component container cho linh vật và thông điệp
 * @returns {JSX.Element} MascotContainer component
 */
const MascotContainer = () => {
  const {
    visible,
    mood,
    size,
    position,
    customStyle,
    message
  } = useMascot();
  
  // State để kiểm soát animation
  const [messageVisible, setMessageVisible] = useState(false);
  
  // Hiển thị message với animation
  useEffect(() => {
    if (message) {
      setMessageVisible(true);
    } else {
      // Ẩn message với thời gian trễ để animation diễn ra
      const timer = setTimeout(() => {
        setMessageVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Lấy vị trí cho bong bóng chat
  const getBubblePosition = useCallback(() => {
    const basePosition = {
      position: 'fixed',
      zIndex: 1001,
    };
    
    // Vị trí dựa trên vị trí của linh vật
    if (position.includes('bottom')) {
      basePosition.bottom = size === 'small' ? 90 : (size === 'medium' ? 130 : 180);
    } else {
      basePosition.top = size === 'small' ? 90 : (size === 'medium' ? 130 : 180);
    }
    
    if (position.includes('right')) {
      basePosition.right = 20;
    }
    
    if (position.includes('left')) {
      basePosition.left = 20;
    }
    
    if (position === 'center') {
      basePosition.top = '40%';
      basePosition.left = '50%';
      basePosition.transform = 'translate(-50%, -50%)';
    }
    
    return basePosition;
  }, [position, size]);

  // Lấy CSS cho mũi tên bong bóng chat
  const getBubbleArrowStyle = useCallback(() => {
    if (position.includes('bottom')) {
      return {
        content: '""',
        position: 'absolute',
        bottom: -10,
        ...(position.includes('right') ? { right: 20 } : { left: 20 }),
        borderWidth: '10px 10px 0',
        borderStyle: 'solid',
        borderColor: 'background.paper transparent transparent',
      };
    } 
    
    if (position.includes('top')) {
      return {
        content: '""',
        position: 'absolute',
        top: -10,
        ...(position.includes('right') ? { right: 20 } : { left: 20 }),
        borderWidth: '0 10px 10px',
        borderStyle: 'solid',
        borderColor: 'transparent transparent background.paper',
      };
    }
    
    return {};
  }, [position]);

  // Ẩn hoàn toàn component này
  return null;
};

// Tối ưu bằng cách sử dụng memo
export default memo(MascotContainer); 
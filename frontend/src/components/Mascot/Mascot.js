import React, { useState, useEffect, useRef } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Component hiển thị linh vật của ứng dụng với các trạng thái khác nhau
 * @param {Object} props - Props của component
 * @param {'static' | 'happy' | 'sad'} props.mood - Trạng thái cảm xúc của linh vật
 * @param {'small' | 'medium' | 'large'} props.size - Kích thước của linh vật
 * @param {Object} props.style - Các style tùy chỉnh
 * @param {Function} props.onClick - Hàm xử lý khi click vào linh vật
 * @returns {JSX.Element} Mascot component
 */
const Mascot = ({ mood = 'static', size = 'medium', style, onClick, position = 'bottom-right' }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  // Xác định kích thước dựa trên props và responsive
  const getSize = () => {
    const sizeMap = {
      small: { width: isMobile ? 60 : 80, height: isMobile ? 60 : 80 },
      medium: { width: isMobile ? 100 : (isTablet ? 140 : 180), height: isMobile ? 100 : (isTablet ? 140 : 180) },
      large: { width: isMobile ? 150 : (isTablet ? 200 : 250), height: isMobile ? 150 : (isTablet ? 200 : 250) },
    };
    return sizeMap[size] || sizeMap.medium;
  };

  // Lấy nguồn tài nguyên dựa trên trạng thái
  const getSource = () => {
    switch (mood) {
      case 'happy':
        return '/assets/linh_vat_vui.webm';
      case 'sad':
        return '/assets/linh-vat-buon.webm';
      case 'static':
      default:
        return '/assets/linh_vat_2.png';
    }
  };

  // Xác định vị trí của linh vật
  const getPosition = () => {
    const positions = {
      'bottom-right': { bottom: 20, right: 20 },
      'bottom-left': { bottom: 20, left: 20 },
      'top-right': { top: 20, right: 20 },
      'top-left': { top: 20, left: 20 },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    };
    return positions[position] || positions['bottom-right'];
  };

  // Xử lý việc phát/dừng video
  const handleVideoClick = () => {
    if (mood !== 'static' && videoRef.current && videoLoaded) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch(error => {
                console.warn('Video play prevented:', error);
                setIsPlaying(false);
              });
          }
        }
      } catch (error) {
        console.warn('Error toggling video playback:', error);
      }
    }
    
    // Gọi hàm onClick nếu được cung cấp
    if (onClick) {
      onClick();
    }
  };

  // Xử lý sự kiện khi video tải xong
  const handleVideoLoaded = () => {
    setVideoLoaded(true);
    // Phát video sau khi tải xong
    if (videoRef.current && mood !== 'static') {
      try {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(error => {
              console.warn('Video autoplay prevented:', error);
              setIsPlaying(false);
            });
        }
      } catch (error) {
        console.warn('Error playing video after load:', error);
      }
    }
  };

  // Tự động phát video khi component được render và mood thay đổi
  useEffect(() => {
    // Reset trạng thái khi mood thay đổi
    setVideoLoaded(false);
    setIsPlaying(false);
    
    // Video sẽ được phát trong sự kiện onLoadedData thay vì ở đây
  }, [mood]);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      // Dừng video khi component unmount để tránh lỗi
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch (error) {
          console.warn('Error cleaning up video:', error);
        }
      }
    };
  }, []);

  const dimensions = getSize();
  const source = getSource();
  const positionStyle = getPosition();

  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: 1000,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'scale(1.05)',
        },
        ...positionStyle,
        ...style
      }}
      onClick={handleVideoClick}
    >
      {mood === 'static' ? (
        <img
          src={source}
          alt="Linh vật"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            objectFit: 'contain'
          }}
        />
      ) : (
        <video
          ref={videoRef}
          src={source}
          muted
          loop
          playsInline  /* Giúp tối ưu trên mobile */
          preload="auto"
          onLoadedData={handleVideoLoaded}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            objectFit: 'contain'
          }}
        />
      )}
    </Box>
  );
};

Mascot.propTypes = {
  mood: PropTypes.oneOf(['static', 'happy', 'sad']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  style: PropTypes.object,
  onClick: PropTypes.func,
  position: PropTypes.oneOf(['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'])
};

export default Mascot; 
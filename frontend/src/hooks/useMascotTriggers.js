import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMascot } from '../components/Mascot/MascotContext';
import { useAuth } from '../context/AuthContext';
import { useGarden } from '../context/GardenContext';
import { useNotification } from '../context/NotificationContext';

/**
 * Hook quản lý các trigger tự động cho linh vật dựa trên
 * các sự kiện trong ứng dụng
 * @returns {Object} Empty object
 */
const useMascotTriggers = () => {
  const location = useLocation();
  const { 
    setHappy, 
    setSad, 
    setStatic, 
    showMessage,
    setMascotPosition
  } = useMascot();
  
  const { currentUser, error: authError } = useAuth();
  const { gardens, error: gardenError } = useGarden();
  const { notifications, unreadCount } = useNotification();
  
  // Sử dụng useRef để lưu trữ các tham chiếu đến setTimeout
  const timersRef = useRef({});
  
  // Hàm tạo timeout với cleanup tự động
  const createTimer = (key, callback, delay) => {
    // Xóa timer cũ nếu có
    if (timersRef.current[key]) {
      clearTimeout(timersRef.current[key]);
    }
    
    // Tạo timer mới
    const timerId = setTimeout(() => {
      callback();
      // Xóa tham chiếu sau khi timer chạy
      timersRef.current[key] = null;
    }, delay);
    
    // Lưu ID timer vào ref
    timersRef.current[key] = timerId;
    
    return timerId;
  };

  // Hiệu ứng cho trang login/register
  useEffect(() => {
    if (location.pathname === '/login') {
      setMascotPosition('bottom-right');
      showMessage('Chào mừng bạn đến với Vườn Thông Minh! Hãy đăng nhập để tiếp tục.', 5000);
    } else if (location.pathname === '/register') {
      setMascotPosition('bottom-right');
      showMessage('Hãy đăng ký để trải nghiệm Vườn Thông Minh!', 5000);
    }
    
    // Cleanup effect
    return () => {
      // Không cần làm gì vì showMessage tự có timeout
    };
  }, [location.pathname, showMessage, setMascotPosition]);

  // Hiệu ứng khi đăng nhập thành công
  useEffect(() => {
    if (currentUser && (location.pathname === '/' || location.pathname === '/dashboard')) {
      setHappy();
      
      // Thời gian không hoạt động
      const lastLogin = currentUser.last_login ? new Date(currentUser.last_login) : null;
      const now = new Date();
      const daysSinceLastLogin = lastLogin ? Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24)) : null;
      
      if (daysSinceLastLogin && daysSinceLastLogin > 7) {
        showMessage(`Chào mừng trở lại, ${currentUser.fullname}! Đã ${daysSinceLastLogin} ngày không gặp bạn rồi.`, 5000);
      } else {
        showMessage(`Xin chào, ${currentUser.fullname}! Chúc bạn một ngày tốt lành.`, 3000);
      }

      // Reset về static sau khi chào
      createTimer('login-reset', () => {
        setStatic();
      }, 6000);
    }
    
    // Cleanup effect
    return () => {
      if (timersRef.current['login-reset']) {
        clearTimeout(timersRef.current['login-reset']);
      }
    };
  }, [currentUser, location.pathname, setHappy, setStatic, showMessage]);

  // Hiệu ứng khi có lỗi
  useEffect(() => {
    if (authError || gardenError) {
      setSad();
      showMessage('Có lỗi xảy ra. Vui lòng thử lại sau.', 4000);

      // Reset về static sau khi thông báo lỗi
      createTimer('error-reset', () => {
        setStatic();
      }, 5000);
    }
    
    // Cleanup effect
    return () => {
      if (timersRef.current['error-reset']) {
        clearTimeout(timersRef.current['error-reset']);
      }
    };
  }, [authError, gardenError, setSad, setStatic, showMessage]);

  // Hiệu ứng khi có thông báo mới
  useEffect(() => {
    if (unreadCount > 0) {
      setHappy();
      showMessage(`Bạn có ${unreadCount} thông báo mới!`, 3000);

      // Reset về static sau khi thông báo
      createTimer('notification-reset', () => {
        setStatic();
      }, 4000);
    }
    
    // Cleanup effect
    return () => {
      if (timersRef.current['notification-reset']) {
        clearTimeout(timersRef.current['notification-reset']);
      }
    };
  }, [unreadCount, setHappy, setStatic, showMessage]);

  // Hiệu ứng cho trang vườn
  useEffect(() => {
    let timerId;
    
    if (location.pathname === '/gardens' && gardens && gardens.length > 0) {
      setHappy();
      showMessage(`Bạn đang có ${gardens.length} khu vườn. Hãy chăm sóc chúng nhé!`, 4000);

      // Reset về static sau khi thông báo
      timerId = createTimer('gardens-reset', () => {
        setStatic();
      }, 5000);
    } else if (location.pathname === '/gardens' && gardens && gardens.length === 0) {
      setSad();
      showMessage('Bạn chưa có khu vườn nào. Hãy tạo một khu vườn mới!', 4000);

      // Reset về static sau khi thông báo
      timerId = createTimer('no-gardens-reset', () => {
        setStatic();
      }, 5000);
    }
    
    // Cleanup effect - chung cho cả hai trường hợp
    return () => {
      if (timersRef.current['gardens-reset']) {
        clearTimeout(timersRef.current['gardens-reset']);
      }
      if (timersRef.current['no-gardens-reset']) {
        clearTimeout(timersRef.current['no-gardens-reset']);
      }
    };
  }, [location.pathname, gardens, setHappy, setSad, setStatic, showMessage]);

  // Cleanup tất cả timer khi unmount
  useEffect(() => {
    return () => {
      // Xóa tất cả các timeout khi component unmount
      Object.keys(timersRef.current).forEach(key => {
        if (timersRef.current[key]) {
          clearTimeout(timersRef.current[key]);
        }
      });
    };
  }, []);

  return {};
};

export default useMascotTriggers; 
import React, { createContext, useState, useContext, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

// Tạo context
const MascotContext = createContext();

/**
 * Hook để sử dụng MascotContext
 * @returns {Object} Các functions và state để điều khiển linh vật
 */
export const useMascot = () => useContext(MascotContext);

/**
 * Provider để quản lý trạng thái linh vật trong toàn bộ ứng dụng
 * @param {Object} props - Props của component
 * @param {React.ReactNode} props.children - Các component con
 * @returns {JSX.Element} MascotProvider component
 */
export const MascotProvider = ({ children }) => {
  // State cho trạng thái linh vật
  const [visible, setVisible] = useState(true);
  const [mood, setMood] = useState('static');
  const [size, setSize] = useState('medium');
  const [position, setPosition] = useState('bottom-right');
  const [customStyle, setCustomStyle] = useState({});
  const [message, setMessage] = useState('');

  // Ref cho các timeout
  const timeoutRef = useRef(null);
  
  // Sử dụng useCallback để tránh tạo hàm mới mỗi lần render
  // Hiển thị linh vật
  const showMascot = useCallback(() => setVisible(true), []);
  
  // Ẩn linh vật
  const hideMascot = useCallback(() => setVisible(false), []);
  
  // Thiết lập trạng thái vui vẻ
  const setHappy = useCallback(() => setMood('happy'), []);
  
  // Thiết lập trạng thái buồn
  const setSad = useCallback(() => setMood('sad'), []);
  
  // Thiết lập trạng thái tĩnh
  const setStatic = useCallback(() => setMood('static'), []);
  
  // Thiết lập kích thước
  const setMascotSize = useCallback((newSize) => {
    if (['small', 'medium', 'large'].includes(newSize)) {
      setSize(newSize);
    }
  }, []);
  
  // Thiết lập vị trí
  const setMascotPosition = useCallback((newPosition) => {
    if (['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'].includes(newPosition)) {
      setPosition(newPosition);
    }
  }, []);
  
  // Thiết lập style tùy chỉnh
  const setMascotStyle = useCallback((style) => {
    setCustomStyle(style);
  }, []);
  
  // Thiết lập thông điệp
  const showMessage = useCallback((text, duration = 3000) => {
    // Xóa timeout cũ nếu có
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setMessage(text);
    
    // Tự động xóa thông điệp sau duration
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        setMessage('');
        timeoutRef.current = null;
      }, duration);
    }
  }, []);
  
  // Xóa thông điệp
  const clearMessage = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage('');
  }, []);
  
  // Reset tất cả về mặc định
  const resetMascot = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(true);
    setMood('static');
    setSize('medium');
    setPosition('bottom-right');
    setCustomStyle({});
    setMessage('');
  }, []);

  // Giá trị context - sử dụng các hàm đã memo
  const value = {
    visible,
    mood,
    size,
    position,
    customStyle,
    message,
    showMascot,
    hideMascot,
    setHappy,
    setSad,
    setStatic,
    setMascotSize,
    setMascotPosition,
    setMascotStyle,
    showMessage,
    clearMessage,
    resetMascot
  };

  return <MascotContext.Provider value={value}>{children}</MascotContext.Provider>;
};

MascotProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default MascotContext; 
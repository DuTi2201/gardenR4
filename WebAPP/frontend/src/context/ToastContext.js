import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

// Tạo context cho toast notifications
const ToastContext = createContext();

// Hook để sử dụng toast context
export const useToast = () => useContext(ToastContext);

// Provider component
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'info', // success, error, warning, info
    duration: 3000,
  });

  // Hàm đóng toast
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast({ ...toast, open: false });
  };

  // Các hàm hiển thị toast với các severity khác nhau
  const showToast = (message, severity = 'info', duration = 3000) => {
    setToast({
      open: true,
      message,
      severity,
      duration,
    });
  };

  // Các helper functions
  const success = (message, duration) => showToast(message, 'success', duration);
  const error = (message, duration) => showToast(message, 'error', duration);
  const warning = (message, duration) => showToast(message, 'warning', duration);
  const info = (message, duration) => showToast(message, 'info', duration);

  // Giá trị được cung cấp cho context
  const contextValue = {
    toast: {
      success,
      error,
      warning,
      info,
    },
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={toast.duration} 
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleClose} 
          severity={toast.severity} 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export default ToastContext; 
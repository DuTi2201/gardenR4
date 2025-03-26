import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Kiểm tra đăng nhập trước khi kết nối socket
    const token = localStorage.getItem('token');
    if (!token) {
      return; // Không kết nối nếu chưa đăng nhập
    }

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token
      }
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected!');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected!');
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    // Cleanup khi component unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [currentUser]);

  // Tham gia vào phòng cho vườn cụ thể
  const joinGardenRoom = (gardenId) => {
    if (socket && gardenId) {
      socket.emit('join_garden', gardenId);
    }
  };

  // Đăng ký lắng nghe sự kiện
  const subscribe = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  // Hủy đăng ký lắng nghe sự kiện
  const unsubscribe = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    isConnected,
    joinGardenRoom,
    subscribe,
    unsubscribe,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}; 
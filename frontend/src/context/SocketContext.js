import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Chỉ kết nối socket nếu người dùng đã đăng nhập
    if (currentUser) {
      const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
      
      const newSocket = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected!');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected!');
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);

      // Cleanup khi component unmount
      return () => {
        newSocket.disconnect();
      };
    }
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
    connected,
    joinGardenRoom,
    subscribe,
    unsubscribe,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}; 
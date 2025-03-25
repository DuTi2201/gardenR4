import React, { createContext, useState, useEffect, useContext } from 'react';
import { notificationService } from '../services';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { socket, subscribe, unsubscribe } = useSocket();
  const { currentUser } = useAuth();

  useEffect(() => {
    // Kiểm tra người dùng đã đăng nhập trước khi tải thông báo
    const token = localStorage.getItem('token');
    if (token) {
      fetchNotifications();
    }
  }, []);

  useEffect(() => {
    if (socket) {
      subscribe('notification', handleNewNotification);
    }

    return () => {
      if (socket) {
        unsubscribe('notification', handleNewNotification);
      }
    };
  }, [socket]);

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter(n => !n.read).length);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải thông báo');
      console.error('Lỗi khi tải thông báo:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      setLoading(true);
      await notificationService.markAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đánh dấu thông báo');
      console.error('Lỗi khi đánh dấu thông báo:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đánh dấu tất cả thông báo');
      console.error('Lỗi khi đánh dấu tất cả thông báo:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setLoading(true);
      await notificationService.deleteNotification(notificationId);
      
      const deleted = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa thông báo');
      console.error('Lỗi khi xóa thông báo:', err);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>; 
};
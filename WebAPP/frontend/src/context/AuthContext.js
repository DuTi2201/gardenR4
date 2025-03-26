import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Kiểm tra xem có thông tin người dùng đã lưu trong localStorage không
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        console.log('User from localStorage:', user);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authService.login(email, password);
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.register(userData);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.updateProfile(userData);
      setCurrentUser(data.user);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Cập nhật thông tin thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.changePassword(passwordData);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
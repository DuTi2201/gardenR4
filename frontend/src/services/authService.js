import api from './api';

const setUserInStorage = (userData) => {
  console.log('Setting user in storage:', userData);
  localStorage.setItem('user', JSON.stringify(userData));
  localStorage.setItem('token', userData.token || '');
};

const login = async (email, password) => {
  try {
    console.log('Login attempt for:', email);
    const response = await api.post('/auth/login', { email, password });
    console.log('Login response:', response.data);
    
    const userData = {
      id: response.data.user.id,
      email: response.data.user.email,
      fullname: response.data.user.fullname,
      avatar: response.data.user.avatar || '',
      role: response.data.user.role || 'user',
      token: response.data.token
    };
    
    setUserInStorage(userData);
    return userData;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    const newUser = {
      id: response.data.user.id,
      email: response.data.user.email,
      fullname: response.data.user.fullname,
      avatar: response.data.user.avatar || '',
      role: response.data.user.role || 'user',
      token: response.data.token
    };
    
    setUserInStorage(newUser);
    return newUser;
  } catch (error) {
    console.error('Register error:', error.response?.data || error.message);
    throw error;
  }
};

const logout = () => {
  console.log('Logging out user');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      console.log('Current user from storage:', userData);
      return userData;
    }
    console.log('No user found in storage');
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

const updateProfile = async (userData) => {
  try {
    console.log('Updating profile:', userData);
    const response = await api.put('/auth/profile', userData);
    console.log('Profile update response:', response.data);
    
    // Cập nhật thông tin người dùng trong localStorage
    const currentUser = getCurrentUser();
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        fullname: response.data.data.fullname,
        avatar: response.data.data.avatar || currentUser.avatar
      };
      
      setUserInStorage(updatedUser);
      return updatedUser;
    }
    return null;
  } catch (error) {
    console.error('Update profile error:', error.response?.data || error.message);
    throw error;
  }
};

const changePassword = async (passwordData) => {
  try {
    console.log('Changing password');
    const response = await api.put('/auth/password', passwordData);
    return response.data;
  } catch (error) {
    console.error('Change password error:', error.response?.data || error.message);
    throw error;
  }
};

export const authService = {
  login,
  register,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword
}; 
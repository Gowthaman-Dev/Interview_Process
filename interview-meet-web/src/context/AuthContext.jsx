import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const loadUser = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.post('/auth/refresh-token', { refreshToken });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      const userRes = await api.get('/auth/me');
      setUser(userRes.data.user);
    } catch (error) {
      console.error('Load user failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      toast.success('Login successful!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Updated register to accept role
  const register = async (name, email, password, role = 'Candidate') => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      toast.success('Registration successful!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setNotificationCount(0);
    toast.success('Logged out');
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('OTP sent to your email (check console)');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset successful. Please login.');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reset failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        notificationCount,
        setNotificationCount,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
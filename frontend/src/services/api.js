import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if already on login/register/auth callback pages
      const currentPath = window.location.pathname;
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/auth/callback') {
        // Just reject the promise, don't show toast or redirect
        return Promise.reject(error);
      }
      
      // Show notification before redirecting
      toast.error('Your session has expired. Please log in again.', {
        duration: 3000,
      });
      
      // Small delay to ensure toast is visible before redirect
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 500);
    }
    return Promise.reject(error);
  }
);

export default api;


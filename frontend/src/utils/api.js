// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // URL backend của bạn
});

// Interceptor để thêm token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

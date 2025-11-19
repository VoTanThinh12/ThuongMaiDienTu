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

// Interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints cho admin
export const adminAPI = {
  // Auth
  login: (data) => api.post('/auth/login', data),
  
  // Dashboard
  getDashboardSummary: () => api.get('/dashboard/summary'),
  
  // Products
  getProducts: () => api.get('/sanpham'),
  createProduct: (data) => api.post('/sanpham', data),
  updateProduct: (id, data) => api.put(`/sanpham/${id}`, data),
  deleteProduct: (id) => api.delete(`/sanpham/${id}`),
  
  // Employees
  getEmployees: () => api.get('/nhanvien'),
  createEmployee: (data) => api.post('/nhanvien', data),
  updateEmployee: (id, data) => api.put(`/nhanvien/${id}`, data),
  deleteEmployee: (id) => api.delete(`/nhanvien/${id}`),
  
  // Orders (Admin)
  getAllOrders: () => api.get('/order/admin/all'),
  updateOrderStatus: (id, data) => api.put(`/order/admin/${id}/status`, data),
  getOrderDetail: (id) => api.get(`/order/${id}`),
  
  // Customers
  getAllCustomers: () => api.get('/customer/admin/all'),
  getCustomerDetail: (id) => api.get(`/customer/admin/${id}`),
  updateCustomerStatus: (id, data) => api.put(`/customer/admin/${id}/status`, data),
  
  // Vouchers
  getVouchers: () => api.get('/voucher'),
  createVoucher: (data) => api.post('/voucher', data),
  updateVoucher: (id, data) => api.put(`/voucher/${id}`, data),
  deleteVoucher: (id) => api.delete(`/voucher/${id}`),
  getVoucherStats: () => api.get('/voucher/stats'),
  
  // Bank Transactions
  getBankTransactions: () => api.get('/bank-transaction'),
  updateTransactionStatus: (id, data) => api.put(`/bank-transaction/${id}/status`, data),
  
  // Reports
  getRevenueReport: (params) => api.get('/baocao/doanhthu', { params }),
  getInventoryReport: (params) => api.get('/baocao/tonkho', { params }),
  getEmployeePerformanceReport: (params) => api.get('/baocao/hieusuatnhanvien', { params }),
};

export default api;

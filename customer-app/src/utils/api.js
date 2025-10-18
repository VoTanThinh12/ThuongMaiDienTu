import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor để tự động thêm token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('customerToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customerInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const customerAPI = {
  register: (data) => api.post('/customer/register', data),
  login: (data) => api.post('/customer/login', data),
  getProfile: () => api.get('/customer/profile'),
  updateProfile: (data) => api.put('/customer/profile', data),
};

export const storefrontAPI = {
  getProducts: (params) => api.get('/storefront/products', { params }),
  getProductDetail: (id) => api.get(`/storefront/products/${id}`),
  getSuggestions: (q) => api.get('/storefront/suggestions', { params: { q } }),
  // Voucher API methods
  get: (url) => api.get(url),
  post: (url, data) => api.post(url, data)
};

export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/add', data),
  updateCartItem: (id, data) => api.put(`/cart/${id}`, data),
  removeFromCart: (id) => api.delete(`/cart/${id}`),
  clearCart: () => api.delete('/cart'),
};

export const orderAPI = {
  createOrder: (data) => api.post('/order', data),
  getMyOrders: () => api.get('/order/my-orders'),
  getOrderDetail: (id) => api.get(`/order/${id}`),
  cancelOrder: (id) => api.put(`/order/${id}/cancel`),
  updateOrder: (id, data) => api.put(`/order/${id}`, data),
  getStatus: (id) => api.get(`/order/${id}`),
};

export const paymentAPI = {
  createVnpayForCustomer: (orderId) => api.get(`/payment/vnpay/create-customer/${orderId}`),
  createMomoForCustomer: (orderId) => api.get(`/payment/momo/create-customer/${orderId}`),
  getPublicConfig: () => api.get('/payment/config/public'),
  createStripeForCustomer: (orderId) => api.get(`/payment/stripe/create-customer/${orderId}`),
  createPaypalForCustomer: (orderId) => api.get(`/payment/paypal/create-customer/${orderId}`),
};

export default api;
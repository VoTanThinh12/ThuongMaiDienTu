const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper function để tạo headers với token
const createHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Helper function để xử lý response
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Có lỗi xảy ra');
  }
  return response.json();
};

// Bank Transaction API
export const bankTransactionAPI = {
  // Lấy tất cả giao dịch ngân hàng
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.dateRange && filters.dateRange.length === 2) {
      queryParams.append('dateRange', JSON.stringify(filters.dateRange));
    }
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const response = await fetch(
      `${API_BASE_URL}/bank-transactions?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: createHeaders()
      }
    );
    
    return handleResponse(response);
  },

  // Lấy thống kê giao dịch
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/bank-transactions/stats`, {
      method: 'GET',
      headers: createHeaders()
    });
    
    return handleResponse(response);
  },

  // Lấy chi tiết giao dịch
  getDetail: async (transactionId) => {
    const response = await fetch(`${API_BASE_URL}/bank-transactions/${transactionId}`, {
      method: 'GET',
      headers: createHeaders()
    });
    
    return handleResponse(response);
  },

  // Xác nhận giao dịch
  verify: async (transactionId, verifiedBy = 'ADMIN') => {
    const response = await fetch(`${API_BASE_URL}/bank-transactions/${transactionId}/verify`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ verifiedBy })
    });
    
    return handleResponse(response);
  },

  // Từ chối giao dịch
  reject: async (transactionId, reason, rejectedBy = 'ADMIN') => {
    const response = await fetch(`${API_BASE_URL}/bank-transactions/${transactionId}/reject`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ reason, rejectedBy })
    });
    
    return handleResponse(response);
  },

  // Lấy giao dịch theo đơn hàng
  getByOrder: async (orderId) => {
    const response = await fetch(`${API_BASE_URL}/bank-transactions/order/${orderId}`, {
      method: 'GET',
      headers: createHeaders()
    });
    
    return handleResponse(response);
  },

  // Xuất báo cáo
  exportReport: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.dateRange && filters.dateRange.length === 2) {
      queryParams.append('dateRange', JSON.stringify(filters.dateRange));
    }
    if (filters.format) queryParams.append('format', filters.format);

    const response = await fetch(
      `${API_BASE_URL}/bank-transactions/export/report?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: createHeaders()
      }
    );
    
    return handleResponse(response);
  }
};

// Order API
export const orderAPI = {
  // Lấy tất cả đơn hàng
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.dateRange && filters.dateRange.length === 2) {
      queryParams.append('dateRange', JSON.stringify(filters.dateRange));
    }
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const response = await fetch(
      `${API_BASE_URL}/orders?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: createHeaders()
      }
    );
    
    return handleResponse(response);
  },

  // Lấy chi tiết đơn hàng
  getDetail: async (orderId) => {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: createHeaders()
    });
    
    return handleResponse(response);
  },

  // Cập nhật trạng thái đơn hàng
  updateStatus: async (orderId, status, note = '') => {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify({ status, note })
    });
    
    return handleResponse(response);
  }
};

// Customer API
export const customerAPI = {
  // Lấy tất cả khách hàng
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const response = await fetch(
      `${API_BASE_URL}/customers?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: createHeaders()
      }
    );
    
    return handleResponse(response);
  },

  // Lấy chi tiết khách hàng
  getDetail: async (customerId) => {
    const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
      method: 'GET',
      headers: createHeaders()
    });
    
    return handleResponse(response);
  }
};

// Product API
export const productAPI = {
  // Lấy tất cả sản phẩm
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const response = await fetch(
      `${API_BASE_URL}/products?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: createHeaders()
      }
    );
    
    return handleResponse(response);
  },

  // Lấy chi tiết sản phẩm
  getDetail: async (productId) => {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: 'GET',
      headers: createHeaders()
    });
    
    return handleResponse(response);
  }
};

// Auth API
export const authAPI = {
  // Đăng nhập admin
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    return handleResponse(response);
  },

  // Đăng xuất
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/admin/logout`, {
      method: 'POST',
      headers: createHeaders()
    });
    
    return handleResponse(response);
  },

  // Lấy thông tin admin hiện tại
  getCurrentAdmin: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/admin/me`, {
      method: 'GET',
      headers: createHeaders()
    });
    
    return handleResponse(response);
  }
};

export default {
  bankTransactionAPI,
  orderAPI,
  customerAPI,
  productAPI,
  authAPI
};








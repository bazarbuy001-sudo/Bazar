/**
 * API Client for Admin Panel
 * Handles all HTTP requests to admin API endpoints
 */

class AdminAPIClient {
  constructor(baseURL = 'http://localhost:3000/api/v1/admin') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method,
      headers: this.getHeaders(),
      ...options,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        this.clearToken();
        window.location.href = '/admin/index.html';
        throw new Error('Unauthorized');
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      // Parse JSON response
      if (response.headers.get('content-type')?.includes('application/json')) {
        return await response.json();
      }

      return response;
    } catch (error) {
      console.error(`API Error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  // ==================== AUTH ====================
  async login(email, password) {
    return this.request('POST', '/login', { email, password });
  }

  async logout() {
    return this.request('POST', '/logout');
  }

  // ==================== PRODUCTS ====================
  async getProducts(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request('GET', `/products${query ? '?' + query : ''}`);
  }

  async getProductById(id) {
    return this.request('GET', `/products/${id}`);
  }

  async createProduct(data) {
    return this.request('POST', '/products', data);
  }

  async updateProduct(id, data) {
    return this.request('PUT', `/products/${id}`, data);
  }

  async deleteProduct(id) {
    return this.request('DELETE', `/products/${id}`);
  }

  async importProducts(format, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    return fetch(`${this.baseURL}/products/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    })
      .then(r => {
        if (r.status === 401) {
          this.clearToken();
          window.location.href = '/admin/index.html';
          throw new Error('Unauthorized');
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
  }

  async uploadProductImages(imageFiles) {
    const formData = new FormData();

    imageFiles.forEach((imageData) => {
      formData.append('images', imageData.file);
      formData.append(`image_${imageData.index}_isMain`, imageData.isMain);
    });

    return fetch(`${this.baseURL}/products/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    })
      .then(r => {
        if (r.status === 401) {
          this.clearToken();
          window.location.href = '/admin/index.html';
          throw new Error('Unauthorized');
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
  }

  // ==================== ORDERS ====================
  async getOrders(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request('GET', `/orders${query ? '?' + query : ''}`);
  }

  async getOrderById(id) {
    return this.request('GET', `/orders/${id}`);
  }

  async updateOrderStatus(id, status) {
    return this.request('PUT', `/orders/${id}`, { status });
  }

  async getOrderStats() {
    return this.request('GET', '/orders/stats');
  }

  // ==================== CLIENTS ====================
  async getClients(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request('GET', `/clients${query ? '?' + query : ''}`);
  }

  async getClientById(id) {
    return this.request('GET', `/clients/${id}`);
  }

  async updateClient(id, data) {
    return this.request('PUT', `/clients/${id}`, data);
  }

  async blockClient(id, reason = '') {
    return this.request('PUT', `/clients/${id}/block`, { reason });
  }

  async unblockClient(id) {
    return this.request('PUT', `/clients/${id}/unblock`);
  }

  async getClientOrders(clientId) {
    return this.request('GET', `/clients/${clientId}/orders`);
  }

  // ==================== DASHBOARD ====================
  async getDashboard() {
    return this.request('GET', '/dashboard');
  }

  // ==================== MESSAGES ====================
  async getMessages(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request('GET', `/messages${query ? '?' + query : ''}`);
  }

  async getChatMessages(chatId) {
    return this.request('GET', `/messages/${chatId}`);
  }

  async sendMessage(chatId, data) {
    return this.request('POST', `/messages/${chatId}`, data);
  }

  async getChats(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request('GET', `/chats${query ? '?' + query : ''}`);
  }
}

// Create global instance
const apiClient = new AdminAPIClient();

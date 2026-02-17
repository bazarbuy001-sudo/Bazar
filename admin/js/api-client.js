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

  // ==================== PRODUCTS (V2) ====================
  async getProducts(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    // Admin endpoint
    const url = `http://localhost:3000/api/v2/admin/products${query ? '?' + query : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }

    return await response.json();
  }

  async getProductById(id) {
    const url = `http://localhost:3000/api/v2/admin/products/${id}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.status}`);
    }

    return await response.json();
  }

  async createProduct(data) {
    const url = `http://localhost:3000/api/v2/admin/products`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async updateProduct(id, data) {
    const url = `http://localhost:3000/api/v2/admin/products/${id}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async deleteProduct(id) {
    const url = `http://localhost:3000/api/v2/admin/products/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete product: ${response.status}`);
    }

    return await response.json();
  }

  async getCategories(type = null) {
    const url = type 
      ? `http://localhost:3000/api/v2/categories?type=${type}`
      : `http://localhost:3000/api/v2/categories`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }

    return await response.json();
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
  // ==================== ORDERS (V2) ====================
  async getOrders(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const url = `http://localhost:3000/api/v2/orders${query ? '?' + query : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }

    return await response.json();
  }

  async getOrderById(id) {
    const url = `http://localhost:3000/api/v2/orders/${id}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch order: ${response.status}`);
    }

    return await response.json();
  }

  async updateOrderStatus(id, status) {
    const url = `http://localhost:3000/api/v2/orders/${id}/status`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async getOrderStats() {
    const url = `http://localhost:3000/api/v2/orders/stats`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch order stats: ${response.status}`);
    }

    return await response.json();
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

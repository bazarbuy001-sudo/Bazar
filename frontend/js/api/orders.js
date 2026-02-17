/**
 * Orders API
 * Работа с заказами клиента
 */

class OrdersAPI {
  constructor(baseURL = 'http://localhost:3000/api/v2') {
    this.baseURL = baseURL;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('client_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * POST /api/v2/orders
   * Создать заказ из корзины
   * 
   * @param {Array} items - Товары из корзины: [{productId, color, meters, rolls}]
   * @param {Object} shippingAddress - Адрес доставки (опционально)
   * @returns {Object} Ответ с orderId, publicId, chatId
   */
  async createOrder(items, shippingAddress = null) {
    if (!items || items.length === 0) {
      throw new Error('Items array is required');
    }

    const url = `${this.baseURL}/orders`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        items,
        shippingAddress
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * GET /api/v2/cabinet/orders
   * Получить список заказов клиента
   */
  async getOrders(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const url = `${this.baseURL}/cabinet/orders${query ? '?' + query : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * GET /api/v2/cabinet/orders/:orderId
   * Получить детали заказа
   */
  async getOrder(orderId) {
    const url = `${this.baseURL}/cabinet/orders/${orderId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * POST /api/v2/cabinet/orders/:orderId/cancel
   * Отменить заказ
   */
  async cancelOrder(orderId) {
    const url = `${this.baseURL}/cabinet/orders/${orderId}/cancel`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }
}

// Create global instance
const ordersAPI = new OrdersAPI();

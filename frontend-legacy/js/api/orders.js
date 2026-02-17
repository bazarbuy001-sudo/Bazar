/**
 * ORDERS API MODULE
 * Работа с заказами через API
 * 
 * GET /api/v1/orders (список заказов)
 * GET /api/v1/orders/:orderId (детали заказа)
 * GET /api/v1/orders/stats (статистика)
 * POST /api/v1/orders/:orderId/cancel (отмена заказа)
 */

const OrdersAPI = (function() {
  'use strict';

  const ENDPOINTS = {
    list: '/orders',
    detail: '/orders/:orderId',
    stats: '/orders/stats',
    cancel: '/orders/:orderId/cancel'
  };

  // ============================================
  // GET ORDERS LIST
  // ============================================

  /**
   * Получить список заказов пользователя
   * 
   * @param {Object} filters - Параметры фильтрации
   * @param {number} filters.page - Номер страницы (по умолчанию 1)
   * @param {number} filters.limit - Заказов на страницу (по умолчанию 10)
   * @param {string} filters.status - Фильтр по статусу (pending, confirmed, processing, shipped, delivered, cancelled)
   * @param {string} filters.sort - Сортировка (createdAt_desc, createdAt_asc, total_desc, etc)
   * @returns {Promise<{success, data, error}>}
   */
  async function getOrders(filters = {}) {
    const result = await ApiClient.get(ENDPOINTS.list, {
      page: filters.page || 1,
      limit: filters.limit || 10,
      status: filters.status || undefined,
      sort: filters.sort || 'createdAt_desc'
    });

    if (result.success) {
      console.log('[OrdersAPI] Список заказов загружен:', result.data);
    }

    return result;
  }

  // ============================================
  // GET ORDER DETAILS
  // ============================================

  /**
   * Получить детали конкретного заказа
   * 
   * @param {string} orderId - ID заказа
   * @returns {Promise<{success, data, error}>}
   */
  async function getOrderById(orderId) {
    if (!orderId) {
      return { success: false, error: 'Order ID is required' };
    }

    const result = await ApiClient.get(
      ENDPOINTS.detail.replace(':orderId', orderId)
    );

    if (result.success) {
      console.log('[OrdersAPI] Детали заказа загружены:', orderId);
    }

    return result;
  }

  // ============================================
  // GET ORDERS STATISTICS
  // ============================================

  /**
   * Получить статистику заказов пользователя
   * 
   * @returns {Promise<{success, data, error}>}
   */
  async function getStats() {
    // Кэшируем статистику
    const cached = ApiClient.getFromCache(ENDPOINTS.stats);
    if (cached) {
      console.log('[OrdersAPI] Статистика из кэша');
      return { success: true, data: cached };
    }

    const result = await ApiClient.get(ENDPOINTS.stats);

    if (result.success) {
      ApiClient.setCache(ENDPOINTS.stats, {}, result.data);
      console.log('[OrdersAPI] Статистика заказов загружена');
    }

    return result;
  }

  // ============================================
  // CANCEL ORDER
  // ============================================

  /**
   * Отменить заказ
   * 
   * @param {string} orderId - ID заказа
   * @param {string} reason - Причина отмены (опционально)
   * @returns {Promise<{success, data, error}>}
   */
  async function cancelOrder(orderId, reason = '') {
    if (!orderId) {
      return { success: false, error: 'Order ID is required' };
    }

    const body = {
      reason: reason || null
    };

    const result = await ApiClient.post(
      ENDPOINTS.cancel.replace(':orderId', orderId),
      body
    );

    if (result.success) {
      console.log('[OrdersAPI] Заказ отменён:', orderId);
      // Очищаем кэш статистики и списка заказов
      ApiClient.clearCache(ENDPOINTS.list);
      ApiClient.clearCache(ENDPOINTS.stats);
    }

    return result;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  function clearOrdersCache() {
    ApiClient.clearCache(ENDPOINTS.list);
    ApiClient.clearCache(ENDPOINTS.detail);
    ApiClient.clearCache(ENDPOINTS.stats);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    getOrders,
    getOrderById,
    getStats,
    cancelOrder,
    clearOrdersCache
  };

})();

// Export
if (typeof window !== 'undefined') {
  window.OrdersAPI = OrdersAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrdersAPI;
}

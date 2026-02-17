/**
 * CART API MODULE
 * Работа с корзиной через API
 * 
 * POST /api/v1/cart (добавить товар)
 * GET /api/v1/cart (получить корзину)
 * PUT /api/v1/cart/:itemId (обновить метраж)
 * DELETE /api/v1/cart/:itemId (удалить товар)
 * DELETE /api/v1/cart (очистить корзину)
 */

const CartAPI = (function() {
  'use strict';

  const ENDPOINTS = {
    list: '/cart',
    item: '/cart/:itemId'
  };

  // ============================================
  // GET CART
  // ============================================

  /**
   * Получить содержимое корзины
   * 
   * @returns {Promise<{success, data, error}>}
   */
  async function getCart() {
    const result = await ApiClient.get(ENDPOINTS.list);
    
    if (result.success) {
      console.log('[CartAPI] Корзина загружена:', result.data);
    }

    return result;
  }

  // ============================================
  // ADD TO CART
  // ============================================

  /**
   * Добавить товар в корзину
   * 
   * @param {Object} item - Товар для добавления
   * @param {string} item.productId - ID товара
   * @param {string} item.color - Цвет (опционально)
   * @param {number} item.meters - Количество метров
   * @param {number} item.rolls - Количество рулонов
   * @returns {Promise<{success, data, error}>}
   */
  async function addToCart(item) {
    if (!item || !item.productId) {
      return { success: false, error: 'Product ID is required' };
    }

    if (typeof item.meters !== 'number' || item.meters <= 0) {
      return { success: false, error: 'Meters must be a positive number' };
    }

    if (typeof item.rolls !== 'number' || item.rolls <= 0) {
      return { success: false, error: 'Rolls must be a positive number' };
    }

    const body = {
      productId: item.productId,
      color: item.color || null,
      meters: item.meters,
      rolls: item.rolls
    };

    const result = await ApiClient.post(ENDPOINTS.list, body);

    if (result.success) {
      console.log('[CartAPI] Товар добавлен в корзину:', body);
      // Очищаем кэш корзины
      ApiClient.clearCache(ENDPOINTS.list);
    }

    return result;
  }

  // ============================================
  // UPDATE CART ITEM
  // ============================================

  /**
   * Обновить товар в корзине (метраж)
   * 
   * @param {string} itemId - ID позиции в корзине
   * @param {Object} updates - Обновления
   * @param {number} updates.meters - Новое количество метров
   * @param {number} updates.rolls - Новое количество рулонов
   * @returns {Promise<{success, data, error}>}
   */
  async function updateCartItem(itemId, updates) {
    if (!itemId) {
      return { success: false, error: 'Item ID is required' };
    }

    if (!updates || (!updates.meters && !updates.rolls)) {
      return { success: false, error: 'Meters or Rolls must be provided' };
    }

    const body = {};
    if (typeof updates.meters === 'number' && updates.meters > 0) {
      body.meters = updates.meters;
    }
    if (typeof updates.rolls === 'number' && updates.rolls > 0) {
      body.rolls = updates.rolls;
    }

    if (Object.keys(body).length === 0) {
      return { success: false, error: 'Invalid update values' };
    }

    const result = await ApiClient.put(
      ENDPOINTS.item.replace(':itemId', itemId),
      body
    );

    if (result.success) {
      console.log('[CartAPI] Товар в корзине обновлён:', itemId, updates);
      ApiClient.clearCache(ENDPOINTS.list);
    }

    return result;
  }

  // ============================================
  // REMOVE FROM CART
  // ============================================

  /**
   * Удалить товар из корзины
   * 
   * @param {string} itemId - ID позиции в корзине
   * @returns {Promise<{success, data, error}>}
   */
  async function removeFromCart(itemId) {
    if (!itemId) {
      return { success: false, error: 'Item ID is required' };
    }

    const result = await ApiClient.delete(
      ENDPOINTS.item.replace(':itemId', itemId)
    );

    if (result.success) {
      console.log('[CartAPI] Товар удалён из корзины:', itemId);
      ApiClient.clearCache(ENDPOINTS.list);
    }

    return result;
  }

  // ============================================
  // CLEAR CART
  // ============================================

  /**
   * Очистить всю корзину
   * 
   * @returns {Promise<{success, data, error}>}
   */
  async function clearCart() {
    const result = await ApiClient.delete(ENDPOINTS.list);

    if (result.success) {
      console.log('[CartAPI] Корзина очищена');
      ApiClient.clearCache(ENDPOINTS.list);
    }

    return result;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
  };

})();

// Export
if (typeof window !== 'undefined') {
  window.CartAPI = CartAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartAPI;
}

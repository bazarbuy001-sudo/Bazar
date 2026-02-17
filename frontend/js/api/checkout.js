/**
 * CHECKOUT API MODULE
 * Работа с процессом оформления заказа (2-step)
 * 
 * Step 1: POST /api/v1/checkout/init (контакты и адрес)
 * Step 2: POST /api/v1/checkout/confirmation (подтверждение)
 * Submit: POST /api/v1/checkout/submit (создание заказа)
 * GET /api/v1/checkout/session/:sessionId (получить состояние сессии)
 */

const CheckoutAPI = (function() {
  'use strict';

  const ENDPOINTS = {
    init: '/checkout/init',
    confirmation: '/checkout/confirmation',
    submit: '/checkout/submit',
    session: '/checkout/session/:sessionId'
  };

  // ============================================
  // STEP 1: INIT CHECKOUT
  // ============================================

  /**
   * Инициализировать checkout (Step 1)
   * Передать контактные данные и адрес доставки
   * 
   * @param {Object} data - Данные для инициализации
   * @param {string} data.name - ФИО или название компании
   * @param {string} data.email - Email
   * @param {string} data.phone - Телефон
   * @param {string} data.city - Город
   * @param {string} data.address - Адрес доставки
   * @param {string} data.postalCode - Почтовый индекс (опционально)
   * @param {string} data.notes - Примечания (опционально)
   * @returns {Promise<{success, data, error}>}
   */
  async function initCheckout(data) {
    if (!data) {
      return { success: false, error: 'Checkout data is required' };
    }

    // Валидация обязательных полей
    const required = ['name', 'email', 'phone', 'city', 'address'];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      return { 
        success: false, 
        error: `Missing required fields: ${missing.join(', ')}` 
      };
    }

    const body = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      address: data.address,
      postalCode: data.postalCode || null,
      notes: data.notes || null
    };

    const result = await ApiClient.post(ENDPOINTS.init, body);

    if (result.success) {
      console.log('[CheckoutAPI] Checkout инициализирован, sessionId:', result.data.sessionId);
      // Сохраняем sessionId в localStorage для следующего шага
      localStorage.setItem('checkout_session_id', result.data.sessionId);
    }

    return result;
  }

  // ============================================
  // STEP 2: CONFIRMATION
  // ============================================

  /**
   * Получить подтверждение заказа перед отправкой (Step 2)
   * 
   * @param {string} sessionId - ID сессии checkпout (из Step 1)
   * @returns {Promise<{success, data, error}>}
   */
  async function getConfirmation(sessionId) {
    if (!sessionId) {
      sessionId = localStorage.getItem('checkout_session_id');
    }

    if (!sessionId) {
      return { success: false, error: 'Session ID is required' };
    }

    const body = {
      sessionId
    };

    const result = await ApiClient.post(ENDPOINTS.confirmation, body);

    if (result.success) {
      console.log('[CheckoutAPI] Получена информация для подтверждения');
    }

    return result;
  }

  // ============================================
  // SUBMIT ORDER
  // ============================================

  /**
   * Отправить заказ (финальный шаг)
   * 
   * @param {string} sessionId - ID сессии checkout
   * @param {Object} confirmData - Дополнительные данные подтверждения (опционально)
   * @returns {Promise<{success, data, error}>}
   */
  async function submitOrder(sessionId, confirmData = {}) {
    if (!sessionId) {
      sessionId = localStorage.getItem('checkout_session_id');
    }

    if (!sessionId) {
      return { success: false, error: 'Session ID is required' };
    }

    const body = {
      sessionId,
      ...confirmData
    };

    const result = await ApiClient.post(ENDPOINTS.submit, body);

    if (result.success) {
      console.log('[CheckoutAPI] Заказ создан, Order ID:', result.data.orderId);
      
      // Очищаем checkout session из localStorage
      localStorage.removeItem('checkout_session_id');
      
      // Очищаем кэш корзины т.к. заказ создан
      ApiClient.clearCache('/cart');
    }

    return result;
  }

  // ============================================
  // GET SESSION INFO
  // ============================================

  /**
   * Получить информацию о сессии checkout
   * 
   * @param {string} sessionId - ID сессии
   * @returns {Promise<{success, data, error}>}
   */
  async function getSessionInfo(sessionId) {
    if (!sessionId) {
      return { success: false, error: 'Session ID is required' };
    }

    const result = await ApiClient.get(
      ENDPOINTS.session.replace(':sessionId', sessionId)
    );

    return result;
  }

  // ============================================
  // CHECKOUT SESSION MANAGEMENT
  // ============================================

  function saveSessionId(sessionId) {
    localStorage.setItem('checkout_session_id', sessionId);
  }

  function getSessionId() {
    return localStorage.getItem('checkout_session_id');
  }

  function clearSessionId() {
    localStorage.removeItem('checkout_session_id');
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // Checkout flow
    initCheckout,
    getConfirmation,
    submitOrder,

    // Session management
    getSessionInfo,
    saveSessionId,
    getSessionId,
    clearSessionId
  };

})();

// Export
if (typeof window !== 'undefined') {
  window.CheckoutAPI = CheckoutAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CheckoutAPI;
}

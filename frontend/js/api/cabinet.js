/**
 * CABINET API MODULE
 * Работа с личным кабинетом через API
 * 
 * GET /api/v1/cabinet/profile
 * PUT /api/v1/cabinet/profile
 * GET /api/v1/cabinet/addresses
 * POST /api/v1/cabinet/addresses
 * DELETE /api/v1/cabinet/addresses/:addressId
 * GET /api/v1/cabinet/preferences
 * PUT /api/v1/cabinet/preferences
 */

const CabinetAPI = (function() {
  'use strict';

  const ENDPOINTS = {
    profile: '/cabinet/profile',
    addresses: '/cabinet/addresses',
    address: '/cabinet/addresses/:addressId',
    preferences: '/cabinet/preferences'
  };

  // ============================================
  // PROFILE
  // ============================================

  /**
   * Получить профиль пользователя
   * 
   * @returns {Promise<{success, data, error}>}
   */
  async function getProfile() {
    const result = await ApiClient.get(ENDPOINTS.profile);

    if (result.success) {
      console.log('[CabinetAPI] Профиль загружен');
    }

    return result;
  }

  /**
   * Обновить профиль пользователя
   * 
   * @param {Object} data - Данные для обновления
   * @param {string} data.name - ФИО / Название компании
   * @param {string} data.email - Email
   * @param {string} data.phone - Телефон
   * @param {string} data.city - Город (опционально)
   * @param {string} data.inn - ИНН (опционально)
   * @returns {Promise<{success, data, error}>}
   */
  async function updateProfile(data) {
    if (!data) {
      return { success: false, error: 'Profile data is required' };
    }

    const body = {
      name: data.name || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      city: data.city || undefined,
      inn: data.inn || undefined
    };

    // Удаляем undefined значения
    Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

    if (Object.keys(body).length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    const result = await ApiClient.put(ENDPOINTS.profile, body);

    if (result.success) {
      console.log('[CabinetAPI] Профиль обновлён');
      // Очищаем кэш профиля
      ApiClient.clearCache(ENDPOINTS.profile);
    }

    return result;
  }

  // ============================================
  // ADDRESSES
  // ============================================

  /**
   * Получить список адресов доставки
   * 
   * @returns {Promise<{success, data, error}>}
   */
  async function getAddresses() {
    const result = await ApiClient.get(ENDPOINTS.addresses);

    if (result.success) {
      console.log('[CabinetAPI] Адреса загружены');
    }

    return result;
  }

  /**
   * Добавить новый адрес доставки
   * 
   * @param {Object} address - Адрес
   * @param {string} address.name - Название адреса (e.g., "Офис", "Склад")
   * @param {string} address.city - Город
   * @param {string} address.address - Адрес
   * @param {string} address.postalCode - Почтовый индекс (опционально)
   * @param {string} address.phone - Телефон (опционально)
   * @param {boolean} address.isDefault - Является ли адресом по умолчанию
   * @returns {Promise<{success, data, error}>}
   */
  async function addAddress(address) {
    if (!address) {
      return { success: false, error: 'Address data is required' };
    }

    const required = ['name', 'city', 'address'];
    const missing = required.filter(field => !address[field]);

    if (missing.length > 0) {
      return { 
        success: false, 
        error: `Missing required fields: ${missing.join(', ')}` 
      };
    }

    const body = {
      name: address.name,
      city: address.city,
      address: address.address,
      postalCode: address.postalCode || null,
      phone: address.phone || null,
      isDefault: address.isDefault || false
    };

    const result = await ApiClient.post(ENDPOINTS.addresses, body);

    if (result.success) {
      console.log('[CabinetAPI] Адрес добавлен');
      ApiClient.clearCache(ENDPOINTS.addresses);
    }

    return result;
  }

  /**
   * Удалить адрес доставки
   * 
   * @param {string} addressId - ID адреса
   * @returns {Promise<{success, data, error}>}
   */
  async function deleteAddress(addressId) {
    if (!addressId) {
      return { success: false, error: 'Address ID is required' };
    }

    const result = await ApiClient.delete(
      ENDPOINTS.address.replace(':addressId', addressId)
    );

    if (result.success) {
      console.log('[CabinetAPI] Адрес удалён:', addressId);
      ApiClient.clearCache(ENDPOINTS.addresses);
    }

    return result;
  }

  // ============================================
  // PREFERENCES
  // ============================================

  /**
   * Получить предпочтения пользователя
   * 
   * @returns {Promise<{success, data, error}>}
   */
  async function getPreferences() {
    const result = await ApiClient.get(ENDPOINTS.preferences);

    if (result.success) {
      console.log('[CabinetAPI] Предпочтения загружены');
    }

    return result;
  }

  /**
   * Обновить предпочтения пользователя
   * 
   * @param {Object} prefs - Предпочтения
   * @param {boolean} prefs.emailNotifications - Уведомления по email
   * @param {boolean} prefs.smsNotifications - Уведомления по SMS
   * @param {string} prefs.language - Язык (ru, en)
   * @param {string} prefs.currency - Валюта (RUB, USD, EUR)
   * @returns {Promise<{success, data, error}>}
   */
  async function updatePreferences(prefs) {
    if (!prefs) {
      return { success: false, error: 'Preferences data is required' };
    }

    const body = {
      emailNotifications: prefs.emailNotifications !== undefined ? prefs.emailNotifications : undefined,
      smsNotifications: prefs.smsNotifications !== undefined ? prefs.smsNotifications : undefined,
      language: prefs.language || undefined,
      currency: prefs.currency || undefined
    };

    // Удаляем undefined значения
    Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

    if (Object.keys(body).length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    const result = await ApiClient.put(ENDPOINTS.preferences, body);

    if (result.success) {
      console.log('[CabinetAPI] Предпочтения обновлены');
      ApiClient.clearCache(ENDPOINTS.preferences);
    }

    return result;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  function clearCabinetCache() {
    ApiClient.clearCache(ENDPOINTS.profile);
    ApiClient.clearCache(ENDPOINTS.addresses);
    ApiClient.clearCache(ENDPOINTS.preferences);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // Profile
    getProfile,
    updateProfile,

    // Addresses
    getAddresses,
    addAddress,
    deleteAddress,

    // Preferences
    getPreferences,
    updatePreferences,

    // Cache
    clearCabinetCache
  };

})();

// Export
if (typeof window !== 'undefined') {
  window.CabinetAPI = CabinetAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CabinetAPI;
}

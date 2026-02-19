/**
 * AUTH MODULE
 * Авторизация и регистрация пользователей
 * 
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * POST /api/v1/auth/logout
 * GET /api/v1/auth/me
 */

const Auth = (function() {
  'use strict';

  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/v1' : '/api/v1';
  const TOKEN_KEY = 'bazar_auth_token';
  const USER_KEY = 'bazar_user_data';

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  /**
   * Получить токен из localStorage
   * @returns {string|null}
   */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Сохранить токен в localStorage
   * @param {string} token
   */
  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  /**
   * Получить данные пользователя из localStorage
   * @returns {Object|null}
   */
  function getUser() {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Сохранить данные пользователя в localStorage
   * @param {Object} user
   */
  function setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Проверить авторизован ли пользователь
   * @returns {boolean}
   */
  function isLoggedIn() {
    const token = getToken();
    const user = getUser();
    return !!(token && user);
  }

  // ============================================
  // API REQUESTS
  // ============================================

  /**
   * Выполнить запрос к API
   * @param {string} endpoint 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async function apiRequest(endpoint, options = {}) {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        },
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Auth] API Error:', data);
        return {
          success: false,
          error: data.error || 'API request failed',
          status: response.status
        };
      }

      return {
        success: true,
        data: data.data || data,
        raw: data
      };
    } catch (error) {
      console.error('[Auth] Network Error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
        status: 0
      };
    }
  }

  // ============================================
  // AUTH METHODS
  // ============================================

  /**
   * Регистрация нового пользователя
   * @param {Object} userData 
   * @param {string} userData.name - Имя/Компания
   * @param {string} userData.email - Email
   * @param {string} userData.password - Пароль
   * @param {string} [userData.phone] - Телефон
   * @param {string} [userData.city] - Город
   * @param {string} [userData.inn] - ИНН
   * @returns {Promise<Object>}
   */
  async function register(userData) {
    if (!userData || !userData.name || !userData.email || !userData.password) {
      return {
        success: false,
        error: 'Заполните обязательные поля: имя, email, пароль'
      };
    }

    if (userData.password.length < 8) {
      return {
        success: false,
        error: 'Пароль должен содержать минимум 8 символов'
      };
    }

    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        phone: userData.phone || undefined,
        city: userData.city || undefined,
        inn: userData.inn || undefined
      })
    });

    if (result.success && result.data.token && result.data.user) {
      setToken(result.data.token);
      setUser(result.data.user);
      console.log('[Auth] Успешная регистрация:', result.data.user.email);
      
      // Генерируем событие для кабинета
      window.dispatchEvent(new CustomEvent('auth:login', {
        detail: { user: result.data.user }
      }));
    }

    return result;
  }

  /**
   * Вход в систему
   * @param {Object} credentials 
   * @param {string} credentials.email - Email
   * @param {string} credentials.password - Пароль
   * @returns {Promise<Object>}
   */
  async function login(credentials) {
    if (!credentials || !credentials.email || !credentials.password) {
      return {
        success: false,
        error: 'Заполните email и пароль'
      };
    }

    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    if (result.success && result.data.token && result.data.user) {
      setToken(result.data.token);
      setUser(result.data.user);
      console.log('[Auth] Успешный вход:', result.data.user.email);
      
      // Генерируем событие для кабинета
      window.dispatchEvent(new CustomEvent('auth:login', {
        detail: { user: result.data.user }
      }));
    }

    return result;
  }

  /**
   * Выход из системы
   * @returns {Promise<Object>}
   */
  async function logout() {
    const result = await apiRequest('/auth/logout', {
      method: 'POST'
    });

    // Очищаем localStorage независимо от ответа сервера
    setToken(null);
    setUser(null);
    console.log('[Auth] Выход из системы');

    // Генерируем событие для кабинета
    window.dispatchEvent(new CustomEvent('auth:logout'));

    return result;
  }

  /**
   * Получить информацию о текущем пользователе
   * @returns {Promise<Object>}
   */
  async function me() {
    if (!getToken()) {
      return {
        success: false,
        error: 'Не авторизован'
      };
    }

    const result = await apiRequest('/auth/me');

    if (result.success && result.data.user) {
      setUser(result.data.user);
      console.log('[Auth] Обновлены данные пользователя');
    } else if (result.status === 401) {
      // Токен недействителен, выходим
      logout();
    }

    return result;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Валидация email
   * @param {string} email 
   * @returns {boolean}
   */
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Валидация пароля
   * @param {string} password 
   * @returns {Object}
   */
  function validatePassword(password) {
    const result = {
      valid: true,
      errors: []
    };

    if (!password || password.length < 8) {
      result.valid = false;
      result.errors.push('Минимум 8 символов');
    }

    if (!/[A-Z]/.test(password)) {
      result.valid = false;
      result.errors.push('Нужна заглавная буква');
    }

    if (!/[0-9]/.test(password)) {
      result.valid = false;
      result.errors.push('Нужна цифра');
    }

    return result;
  }

  /**
   * Инициализация модуля
   */
  function init() {
    console.log('[Auth] Модуль инициализирован');
    
    // Проверяем токен при загрузке
    if (getToken()) {
      // Проверяем валидность токена
      me().catch(console.error);
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // Auth methods
    register,
    login,
    logout,
    me,
    
    // State
    isLoggedIn,
    getToken,
    getUser,
    
    // Validation
    isValidEmail,
    validatePassword,
    
    // Init
    init
  };

})();

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Auth.init);
} else {
  Auth.init();
}

// Export
if (typeof window !== 'undefined') {
  window.Auth = Auth;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
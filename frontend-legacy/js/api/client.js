/**
 * API CLIENT
 * Базовый HTTP клиент для работы с backend API
 * 
 * Основано на fetch API с поддержкой:
 * - Error handling (404, 500, timeout, network errors)
 * - Loading states
 * - Retry logic
 * - Request/Response interceptors
 * - Token management (если нужна авторизация)
 */

const ApiClient = (function() {
  'use strict';

  const CONFIG = {
    baseURL: 'http://localhost:3000/api/v1',
    timeout: 10000, // 10 seconds
    retries: 2,
    retryDelay: 1000, // 1 second
  };

  let authToken = null;
  let isLoading = false;
  let loadingCount = 0;

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  function setAuthToken(token) {
    authToken = token;
    if (token) {
      localStorage.setItem('api_auth_token', token);
    } else {
      localStorage.removeItem('api_auth_token');
    }
  }

  function getAuthToken() {
    if (!authToken) {
      authToken = localStorage.getItem('api_auth_token');
    }
    return authToken;
  }

  function clearAuthToken() {
    setAuthToken(null);
  }

  // ============================================
  // LOADING STATE
  // ============================================

  function _startLoading() {
    loadingCount++;
    isLoading = loadingCount > 0;
    _notifyLoadingChange();
  }

  function _stopLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    isLoading = loadingCount > 0;
    _notifyLoadingChange();
  }

  function _notifyLoadingChange() {
    document.dispatchEvent(new CustomEvent('api:loading', {
      detail: { isLoading }
    }));
  }

  function getLoadingState() {
    return isLoading;
  }

  // ============================================
  // REQUEST BUILDER
  // ============================================

  function _buildHeaders(options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  function _buildURL(endpoint, params = {}) {
    const url = new URL(CONFIG.baseURL + endpoint);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    return url.toString();
  }

  // ============================================
  // RETRY LOGIC
  // ============================================

  async function _fetchWithRetry(url, options = {}, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: _buildHeaders(options.headers || {})
      });

      clearTimeout(timeoutId);

      // Если ответ 5xx и это не последняя попытка, повторяем
      if (response.status >= 500 && attempt < CONFIG.retries) {
        await _delay(CONFIG.retryDelay * attempt);
        return _fetchWithRetry(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 'TIMEOUT', 408);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError('Network error', 'NETWORK_ERROR', 0);
      }

      if (attempt < CONFIG.retries) {
        await _delay(CONFIG.retryDelay * attempt);
        return _fetchWithRetry(url, options, attempt + 1);
      }

      throw error;
    }
  }

  function _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // RESPONSE PARSER
  // ============================================

  async function _parseResponse(response) {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      let errorData;
      try {
        errorData = contentType?.includes('application/json') 
          ? await response.json() 
          : await response.text();
      } catch (e) {
        errorData = { error: 'Unknown error' };
      }

      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
      throw new ApiError(
        errorMessage,
        response.status === 404 ? 'NOT_FOUND' : 'API_ERROR',
        response.status
      );
    }

    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  }

  // ============================================
  // ERROR CLASS
  // ============================================

  class ApiError extends Error {
    constructor(message, code = 'API_ERROR', status = 500) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.status = status;
    }
  }

  // ============================================
  // HTTP METHODS
  // ============================================

  async function request(method, endpoint, options = {}) {
    _startLoading();

    try {
      const url = _buildURL(endpoint, options.params);

      const fetchOptions = {
        method,
        headers: options.headers
      };

      if (method !== 'GET' && options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await _fetchWithRetry(url, fetchOptions);
      const data = await _parseResponse(response);

      return {
        success: true,
        data,
        status: response.status
      };
    } catch (error) {
      console.error(`[API ${method} ${endpoint}]`, error);

      const apiError = error instanceof ApiError ? error : 
        new ApiError(error.message, 'UNKNOWN_ERROR', 500);

      return {
        success: false,
        error: apiError.message,
        code: apiError.code,
        status: apiError.status
      };
    } finally {
      _stopLoading();
    }
  }

  async function get(endpoint, params = {}, options = {}) {
    return request('GET', endpoint, { ...options, params });
  }

  async function post(endpoint, body = {}, options = {}) {
    return request('POST', endpoint, { ...options, body });
  }

  async function put(endpoint, body = {}, options = {}) {
    return request('PUT', endpoint, { ...options, body });
  }

  async function patch(endpoint, body = {}, options = {}) {
    return request('PATCH', endpoint, { ...options, body });
  }

  async function del(endpoint, options = {}) {
    return request('DELETE', endpoint, options);
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  const cache = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  function _getCacheKey(endpoint, params) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  function _isCacheValid(cacheEntry) {
    return Date.now() - cacheEntry.timestamp < CACHE_TTL;
  }

  function getFromCache(endpoint, params = {}) {
    const key = _getCacheKey(endpoint, params);
    const cacheEntry = cache.get(key);

    if (cacheEntry && _isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }

    return null;
  }

  function setCache(endpoint, params, data) {
    const key = _getCacheKey(endpoint, params);
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  function clearCache(endpoint = null) {
    if (endpoint) {
      for (const key of cache.keys()) {
        if (key.startsWith(endpoint)) {
          cache.delete(key);
        }
      }
    } else {
      cache.clear();
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // HTTP methods
    request,
    get,
    post,
    put,
    patch,
    delete: del,

    // Auth
    setAuthToken,
    getAuthToken,
    clearAuthToken,

    // Loading state
    getLoadingState,

    // Cache
    getFromCache,
    setCache,
    clearCache,

    // Config
    setBaseURL: (url) => { CONFIG.baseURL = url; },
    setTimeout: (ms) => { CONFIG.timeout = ms; }
  };

})();

// Export for global use
if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}

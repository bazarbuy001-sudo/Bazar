/**
 * PRODUCTS API MODULE
 * Работа с каталогом товаров через API
 * 
 * GET /api/v1/products (фильтрация, сортировка, пагинация)
 * GET /api/v1/products/:id
 * GET /api/v1/products/categories
 * GET /api/v1/products/colors/:category
 * GET /api/v1/products/price-range
 */

const ProductsAPI = (function() {
  'use strict';

  const ENDPOINTS = {
    list: '/products',
    detail: '/products/:id',
    categories: '/products/categories',
    colors: '/products/colors/:category',
    priceRange: '/products/price-range'
  };

  // ============================================
  // PRODUCTS LIST
  // ============================================

  /**
   * Получить список товаров с фильтрацией и сортировкой
   * 
   * @param {Object} filters - Параметры фильтрации
   * @param {string} filters.category - Категория товара
   * @param {string} filters.search - Поиск по названию
   * @param {string} filters.sort - Сортировка (price_asc, price_desc, name_asc, etc)
   * @param {number} filters.page - Номер страницы (по умолчанию 1)
   * @param {number} filters.limit - Товаров на страницу (по умолчанию 20)
   * @param {number} filters.minPrice - Минимальная цена
   * @param {number} filters.maxPrice - Максимальная цена
   * @returns {Promise<{success, data, error}>}
   */
  async function getProducts(filters = {}) {
    // Проверяем кэш для стандартных фильтров
    const cacheKey = JSON.stringify(filters);
    if (!filters.search && !filters.category) {
      const cached = ApiClient.getFromCache(ENDPOINTS.list, filters);
      if (cached) {
        console.log('[ProductsAPI] Возвращаем из кэша');
        return { success: true, data: cached };
      }
    }

    const result = await ApiClient.get(ENDPOINTS.list, {
      category: filters.category || undefined,
      search: filters.search || undefined,
      sort: filters.sort || undefined,
      page: filters.page || 1,
      limit: filters.limit || 20,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined
    });

    // Кэшируем результат для фильтров без поиска
    if (result.success && !filters.search && !filters.category) {
      ApiClient.setCache(ENDPOINTS.list, filters, result.data);
    }

    return result;
  }

  /**
   * Получить товар по ID
   * 
   * @param {string} productId - ID товара
   * @returns {Promise<{success, data, error}>}
   */
  async function getProductById(productId) {
    if (!productId) {
      return { success: false, error: 'Product ID is required' };
    }

    // Кэш по ID товара
    const cached = ApiClient.getFromCache(ENDPOINTS.detail, { id: productId });
    if (cached) {
      console.log('[ProductsAPI] Товар из кэша:', productId);
      return { success: true, data: cached };
    }

    const result = await ApiClient.get(ENDPOINTS.detail.replace(':id', productId));

    if (result.success) {
      ApiClient.setCache(ENDPOINTS.detail, { id: productId }, result.data);
    }

    return result;
  }

  // ============================================
  // CATEGORIES & ATTRIBUTES
  // ============================================

  /**
   * Получить список всех категорий
   * 
   * @returns {Promise<{success, data, error}>}
   */
  async function getCategories() {
    // Кэш на все категории
    const cached = ApiClient.getFromCache(ENDPOINTS.categories);
    if (cached) {
      console.log('[ProductsAPI] Категории из кэша');
      return { success: true, data: cached };
    }

    const result = await ApiClient.get(ENDPOINTS.categories);

    if (result.success) {
      ApiClient.setCache(ENDPOINTS.categories, {}, result.data);
    }

    return result;
  }

  /**
   * Получить цвета для конкретной категории
   * 
   * @param {string} category - Название категории
   * @returns {Promise<{success, data, error}>}
   */
  async function getColorsByCategory(category) {
    if (!category) {
      return { success: false, error: 'Category is required' };
    }

    // Кэш по категории
    const cached = ApiClient.getFromCache(ENDPOINTS.colors, { category });
    if (cached) {
      console.log('[ProductsAPI] Цвета из кэша для категории:', category);
      return { success: true, data: cached };
    }

    const result = await ApiClient.get(
      ENDPOINTS.colors.replace(':category', category)
    );

    if (result.success) {
      ApiClient.setCache(ENDPOINTS.colors, { category }, result.data);
    }

    return result;
  }

  /**
   * Получить диапазон цен для фильтра
   * 
   * @returns {Promise<{success, data, error}>}
   */
  async function getPriceRange() {
    // Кэш на диапазон цен
    const cached = ApiClient.getFromCache(ENDPOINTS.priceRange);
    if (cached) {
      console.log('[ProductsAPI] Диапазон цен из кэша');
      return { success: true, data: cached };
    }

    const result = await ApiClient.get(ENDPOINTS.priceRange);

    if (result.success) {
      ApiClient.setCache(ENDPOINTS.priceRange, {}, result.data);
    }

    return result;
  }

  // ============================================
  // SEARCH
  // ============================================

  /**
   * Поиск товаров по названию
   * 
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Дополнительные параметры
   * @returns {Promise<{success, data, error}>}
   */
  async function search(query, options = {}) {
    if (!query || query.trim().length < 2) {
      return { success: false, error: 'Search query must be at least 2 characters' };
    }

    const result = await ApiClient.get(ENDPOINTS.list, {
      search: query.trim(),
      page: options.page || 1,
      limit: options.limit || 20
    });

    return result;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  function clearProductsCache() {
    ApiClient.clearCache(ENDPOINTS.list);
    ApiClient.clearCache(ENDPOINTS.detail);
  }

  function clearCategoriesCache() {
    ApiClient.clearCache(ENDPOINTS.categories);
    ApiClient.clearCache(ENDPOINTS.colors);
  }

  function clearAllCache() {
    clearProductsCache();
    clearCategoriesCache();
    ApiClient.clearCache(ENDPOINTS.priceRange);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  return {
    // Products
    getProducts,
    getProductById,
    search,

    // Categories & Attributes
    getCategories,
    getColorsByCategory,
    getPriceRange,

    // Cache management
    clearProductsCache,
    clearCategoriesCache,
    clearAllCache
  };

})();

// Export
if (typeof window !== 'undefined') {
  window.ProductsAPI = ProductsAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductsAPI;
}

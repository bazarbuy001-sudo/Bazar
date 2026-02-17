/**
 * LocalJSONSource - Источник данных из локальных JSON файлов
 * Реализует текущее поведение загрузки данных
 */
const LocalJSONSource = (function () {
  'use strict';

  let _cache = null;

  /**
   * Загрузить товары из JSON файла
   * @param {string|Object} source - URL JSON файла или объект данных
   * @returns {Promise<void>}
   */
  async function loadProducts(source) {
    // Если данные уже загружены — не перезагружаем
    if (_cache !== null) {
      return;
    }

    // Если передан объект — используем как есть
    if (typeof source === 'object' && source !== null) {
      _cache = source;
      return;
    }

    // Если передана строка — считаем URL и загружаем через fetch
    if (typeof source === 'string') {
      const response = await fetch(source);

      if (!response.ok) {
        throw new Error(`LocalJSONSource.loadProducts: HTTP ${response.status}`);
      }

      const data = await response.json();
      _cache = data;
      return;
    }

    throw new Error('LocalJSONSource.loadProducts: source должен быть URL или объектом данных');
  }

  /**
   * Получить все товары
   * @returns {Array}
   */
  function getAllProducts() {
    if (_cache === null) {
      return [];
    }

    // Если кеш — массив, считаем его списком товаров
    if (Array.isArray(_cache)) {
      return _cache;
    }

    // Если кеш — объект, ищем первый массив объектов
    if (typeof _cache === 'object') {
      for (const key in _cache) {
        const value = _cache[key];
        if (Array.isArray(value) && value.length > 0) {
          const firstItem = value[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            return value;
          }
        }
      }
    }

    return [];
  }

  /**
   * Получить товар по ID
   * @param {string|number} productId - ID товара
   * @returns {Object|null}
   */
  function getProductById(productId) {
    const products = getAllProducts();
    
    if (products.length === 0) {
      return null;
    }

    // Ищем по полю id или productId для совместимости
    const found = products.find(item => {
      const id = item.id || item.productId;
      return id === parseInt(productId) || id === String(productId) || id === productId;
    });
    
    return found || null;
  }

  return {
    loadProducts,
    getAllProducts,
    getProductById
  };
})();

// Экспорт в глобальную область
if (typeof window !== 'undefined') {
  window.LocalJSONSource = LocalJSONSource;
}





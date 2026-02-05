/**
 * CatalogPagination - Модуль пагинации каталога
 * Управление постраничным отображением товаров
 */
const CatalogPagination = (function () {
  'use strict';

  let currentPage = 1;
  let pageSize = 24;
  let _initialized = false;

  /**
   * Инициализация пагинации
   * @param {Object} options
   * @param {number} options.pageSize - размер страницы
   */
  function init(options = {}) {
    if (_initialized) {
      console.warn('[CatalogPagination] Already initialized');
      return;
    }

    if (options.pageSize && typeof options.pageSize === 'number' && options.pageSize > 0) {
      pageSize = options.pageSize;
    }

    _initialized = true;
  }

  /**
   * Применить пагинацию к массиву продуктов
   * @param {Array} products
   * @returns {Array}
   */
  function applyPagination(products) {
    if (!Array.isArray(products)) {
      return [];
    }
    return products.slice(0, currentPage * pageSize);
  }

  /**
   * Перейти на следующую страницу
   */
  function nextPage() {
    currentPage += 1;
  }

  /**
   * Сбросить пагинацию
   */
  function reset() {
    currentPage = 1;
  }

  /**
   * Получить текущую страницу
   * @returns {number}
   */
  function getCurrentPage() {
    return currentPage;
  }

  /**
   * Получить размер страницы
   * @returns {number}
   */
  function getPageSize() {
    return pageSize;
  }

  return {
    init,
    destroy: function() {
      currentPage = 1;
      pageSize = 24;
      _initialized = false;
      console.log('[CatalogPagination] Destroyed');
    },
    applyPagination,
    nextPage,
    reset,
    getCurrentPage,
    getPageSize
  };
})();

// Экспорт в глобальную область
if (typeof window !== 'undefined') {
  window.CatalogPagination = CatalogPagination;
}

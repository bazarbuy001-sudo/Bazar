/**
 * CatalogCore - Ядро каталога товаров
 * Управление потоком данных: загрузка → фильтры → сортировка → пагинация
 */
const CatalogCore = (function () {
  'use strict';

  let state = {
    allProducts: [],
    filteredProducts: [],
    sortedProducts: [],
    pagedProducts: []
  };

  /**
   * Инициализация каталога
   * @param {string|Object} source - URL или объект данных
   */
  async function init(source) {
    await CatalogDataStore.load(source);
    
    state.allProducts = CatalogDataStore.getAllProducts();
    
    CatalogFilters.buildFilters(state.allProducts);
    
    state.filteredProducts = CatalogFilters.applyFilters(state.allProducts);
    
    if (typeof CatalogSorting !== 'undefined' && 
        typeof CatalogSorting.applySorting === 'function') {
      state.sortedProducts = CatalogSorting.applySorting(state.filteredProducts);
    } else {
      state.sortedProducts = state.filteredProducts;
    }
    
    if (typeof CatalogPagination !== 'undefined' && 
        typeof CatalogPagination.applyPagination === 'function') {
      state.pagedProducts = CatalogPagination.applyPagination(state.sortedProducts);
    } else {
      state.pagedProducts = state.sortedProducts;
    }
  }

  /**
   * Пересчитать каталог при изменении фильтров / сортировки / пагинации
   */
  function refresh() {
    state.filteredProducts = CatalogFilters.applyFilters(state.allProducts);
    
    if (typeof CatalogSorting !== 'undefined' && 
        typeof CatalogSorting.applySorting === 'function') {
      state.sortedProducts = CatalogSorting.applySorting(state.filteredProducts);
    } else {
      state.sortedProducts = state.filteredProducts;
    }
    
    if (typeof CatalogPagination !== 'undefined' && 
        typeof CatalogPagination.applyPagination === 'function') {
      state.pagedProducts = CatalogPagination.applyPagination(state.sortedProducts);
    } else {
      state.pagedProducts = state.sortedProducts;
    }
  }

  /**
   * Получить продукты после всех преобразований
   * @returns {Array}
   */
  function getProducts() {
    return [...state.pagedProducts];
  }

  /**
   * Получить общее количество товаров после фильтров и сортировки
   * @returns {number}
   */
  function getTotalCount() {
    return state.sortedProducts.length;
  }

  return {
    init,
    refresh,
    getProducts,
    getTotalCount
  };
})();

// Экспорт в глобальную область
if (typeof window !== 'undefined') {
  window.CatalogCore = CatalogCore;
}

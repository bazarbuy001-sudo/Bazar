/**
 * CatalogDataStore
 * Хранилище данных каталога
 * Загрузка данных один раз, далее работа из памяти
 * 
 * Использует абстракцию источника данных для поддержки разных источников
 * (локальные JSON, WordPress REST API и т.д.)
 * 
 * Для подключения WordPress достаточно заменить источник данных
 */
const CatalogDataStore = (function () {
  'use strict';

  // Источник данных (по умолчанию LocalJSONSource)
  let _dataSource = LocalJSONSource;

  /**
   * Установить источник данных
   * @param {Object} dataSource - Объект с методами loadProducts, getAllProducts, getProductById
   */
  function setDataSource(dataSource) {
    if (dataSource && 
        typeof dataSource.loadProducts === 'function' &&
        typeof dataSource.getAllProducts === 'function' &&
        typeof dataSource.getProductById === 'function') {
      _dataSource = dataSource;
    } else {
      throw new Error('CatalogDataStore.setDataSource: невалидный источник данных');
    }
  }

  /**
   * Загрузка данных
   * @param {string|Object} source - URL или объект данных
   * @returns {Promise<Object>}
   */
  async function load(source) {
    await _dataSource.loadProducts(source);
    return _dataSource.getAllProducts();
  }

  /**
   * Получить все товары
   * Всегда возвращает массив
   * @returns {Array}
   */
  function getAllProducts() {
    return _dataSource.getAllProducts();
  }

  /**
   * Получить товар по ID
   * @param {string|number} productId - ID товара
   * @returns {Object|null}
   */
  function getProductById(productId) {
    return _dataSource.getProductById(productId);
  }

  /**
   * Получить вложенное значение по ключу (поддержка dot notation)
   * @param {Object} obj
   * @param {string} key
   * @returns {*}
   */
  function getNestedValue(obj, key) {
    if (!obj || !key) return undefined;
    
    const keys = key.split('.');
    let value = obj;
    
    for (const k of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[k];
    }
    
    return value;
  }

  /**
   * Определить тип параметра на основе данных
   * @param {string} paramKey - Ключ параметра
   * @returns {'boolean'|'range'|'list'|null}
   */
  function detectParamType(paramKey) {
    const products = getAllProducts();
    
    if (products.length === 0) {
      return null;
    }

    const values = [];
    
    for (const product of products) {
      const value = getNestedValue(product, paramKey);
      
      if (value === undefined || value === null) {
        continue;
      }
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        continue;
      }
      
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null) {
            values.push(item);
          }
        }
      } else {
        values.push(value);
      }
    }
    
    if (values.length === 0) {
      return null;
    }
    
    const allBoolean = values.every(v => typeof v === 'boolean');
    if (allBoolean) {
      return 'boolean';
    }
    
    const allNumber = values.every(v => typeof v === 'number');
    if (allNumber) {
      return 'range';
    }
    
    const allString = values.every(v => typeof v === 'string');
    if (allString) {
      const uniqueValues = new Set(values);
      const uniqueCount = uniqueValues.size;
      
      if (uniqueCount <= 20) {
        return 'list';
      }
      
      return null;
    }
    
    return null;
  }

  /**
   * Получить уникальные значения параметра
   * @param {string} paramKey - Ключ параметра
   * @returns {Array}
   */
  function getUniqueValues(paramKey) {
    const paramType = detectParamType(paramKey);
    
    if (paramType !== 'list') {
      return [];
    }

    const products = getAllProducts();
    const values = new Set();
    
    for (const product of products) {
      const value = getNestedValue(product, paramKey);
      
      if (value === undefined || value === null) {
        continue;
      }
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        continue;
      }
      
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null) {
            values.add(item);
          }
        }
      } else {
        values.add(value);
      }
    }
    
    return Array.from(values);
  }

  /**
   * Получить список фильтруемых ключей параметров
   * @returns {Array<string>}
   */
  function getFilterableKeys() {
    const products = getAllProducts();
    
    if (products.length === 0) {
      return [];
    }

    const allKeys = new Set();
    
    for (const product of products) {
      for (const key in product) {
        const value = product[key];
        
        if (value === undefined || value === null) {
          continue;
        }
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          continue;
        }
        
        allKeys.add(key);
      }
    }

    const filterableKeys = [];
    
    for (const key of allKeys) {
      const paramType = detectParamType(key);
      if (paramType !== null) {
        filterableKeys.push(key);
      }
    }

    return filterableKeys;
  }

  return {
    load,
    getAllProducts,
    getProductById,
    setDataSource,
    detectParamType,
    getUniqueValues,
    getFilterableKeys
  };
})();

// Экспорт в глобальную область
if (typeof window !== 'undefined') {
  window.CatalogDataStore = CatalogDataStore;
}

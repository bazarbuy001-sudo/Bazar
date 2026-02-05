/**
 * CatalogFilters - Модуль фильтров каталога
 * Каркас модуля
 */
const CatalogFilters = (function () {
  'use strict';

  const state = {
    available: {},
    active: {}
  };
  // Инициализация флага, чтобы избежать двойного биндинга/инициализации
  let _initialized = false;

  /**
   * Преобразовать строку в slug
   * @private
   * @param {string} str - Строка для преобразования
   * @returns {string} Slug
   */
  function toSlug(str) {
    if (typeof str !== 'string') return '';
    return str.toLowerCase()
      .replace(/[а-яё]/g, (char) => {
        const map = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      })
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Получить fabric_type из товара (с fallback на category)
   * @private
   * @param {Object} product - Товар
   * @returns {string|null} Slug типа ткани
   */
  function getFabricTypeSlug(product) {
    if (!product) return null;
    
    // Приоритет: fabric_type, затем category (преобразованный в slug)
    const type = product.fabric_type || product.category;
    if (!type) return null;
    
    // Если уже slug (нет пробелов и кириллицы) - возвращаем как есть
    if (typeof type === 'string' && /^[a-z0-9-]+$/.test(type)) {
      return type;
    }
    
    // Преобразуем в slug
    return toSlug(type);
  }

  /**
   * Инициализация фильтров
   * @param {Array} products - Массив товаров (опционально)
   */
  function init(products = null) {
    if (_initialized) {
      console.warn('[CatalogFilters] Already initialized');
      return;
    }

    const productsToUse = products || (window.CatalogDataStore ? CatalogDataStore.getAllProducts() : []);

    if (!Array.isArray(productsToUse) || productsToUse.length === 0) {
      state.available = {};
      state.active = {};
      _initialized = true;
      return;
    }

    // Построить доступные фильтры
    buildFilters(productsToUse);

    // Сбросить активные фильтры
    state.active = {};

    _initialized = true;
  }

  /**
   * Построение фильтров из данных
   * @param {Array} products - Массив товаров
   */
  function buildFilters(products) {
    if (!Array.isArray(products) || products.length === 0) {
      state.available = {};
      return;
    }

    state.available = {};
    const filterableKeys = CatalogDataStore.getFilterableKeys();

    for (const paramKey of filterableKeys) {
      const paramType = CatalogDataStore.detectParamType(paramKey);

      if (paramType === null) {
        continue;
      }

      if (paramType === 'list') {
        const values = CatalogDataStore.getUniqueValues(paramKey);
        if (values.length === 0) {
          continue;
        }
        state.available[paramKey] = {
          type: 'list',
          values: values
        };
      } else if (paramType === 'range') {
        state.available[paramKey] = {
          type: 'range'
        };
      } else if (paramType === 'boolean') {
        state.available[paramKey] = {
          type: 'boolean'
        };
      }
    }
  }

  /**
   * Применить фильтры к массиву продуктов (внутренняя версия с параметром фильтров)
   * @private
   * @param {Array} products - Массив продуктов
   * @param {Object} filtersToApply - Фильтры для применения (копия state.active)
   * @returns {Array}
   */
  function applyFiltersInternal(products, filtersToApply) {
    if (!Array.isArray(products)) {
      return [];
    }

    if (!filtersToApply || Object.keys(filtersToApply).length === 0) {
      return products;
    }

    const filtered = [];

    for (const product of products) {
      let passesAllFilters = true;

      for (const paramKey in filtersToApply) {
        const filterValue = filtersToApply[paramKey];
        const filterConfig = state.available[paramKey];
        
        if (!filterConfig) {
          passesAllFilters = false;
          break;
        }

        const filterType = filterConfig.type;
        let matches = false;

        // === СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ fabric_type ===
        if (paramKey === 'fabric_type') {
          const productTypeSlug = getFabricTypeSlug(product);
          if (!productTypeSlug) {
            passesAllFilters = false;
            break;
          }
          
          // filterValue должен быть массивом slug'ов
          if (!Array.isArray(filterValue)) {
            passesAllFilters = false;
            break;
          }
          
          // Сравниваем slug'и
          matches = filterValue.some(filterSlug => {
            const filterSlugNormalized = toSlug(filterSlug);
            return filterSlugNormalized === productTypeSlug;
          });
        }
        // === СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ colors ===
        else if (paramKey === 'colors') {
          if (!Array.isArray(product.colors) || product.colors.length === 0) {
            passesAllFilters = false;
            break;
          }
          
          if (!Array.isArray(filterValue)) {
            passesAllFilters = false;
            break;
          }
          
          // Сравниваем slug'и цветов
          const productColorSlugs = product.colors.map(c => toSlug(c));
          matches = filterValue.some(filterColor => {
            const filterColorSlug = toSlug(filterColor);
            return productColorSlugs.includes(filterColorSlug);
          });
        }
        // === СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ price ===
        else if (paramKey === 'price') {
          // Исключаем товары с price_on_request = true при активном фильтре цены
          if (product.price_on_request === true) {
            passesAllFilters = false;
            break;
          }
          
          if (typeof filterValue !== 'object' || filterValue === null || 
              filterValue.min === undefined || filterValue.max === undefined) {
            passesAllFilters = false;
            break;
          }
          
          const price = parseFloat(product.price);
          if (isNaN(price) || price <= 0) {
            passesAllFilters = false;
            break;
          }
          
          matches = price >= filterValue.min && price <= filterValue.max;
        }
        // === СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ fabric_meterage ===
        else if (paramKey === 'fabric_meterage') {
          // Пропускаем товары без метража
          if (product.fabric_meterage === null || product.fabric_meterage === undefined) {
            passesAllFilters = false;
            break;
          }
          
          if (typeof filterValue !== 'object' || filterValue === null || 
              filterValue.min === undefined || filterValue.max === undefined) {
            passesAllFilters = false;
            break;
          }
          
          const meterage = parseFloat(product.fabric_meterage);
          if (isNaN(meterage) || meterage <= 0) {
            passesAllFilters = false;
            break;
          }
          
          matches = meterage >= filterValue.min && meterage <= filterValue.max;
        }
        // === СТАНДАРТНАЯ ОБРАБОТКА ===
        else {
          const value = product[paramKey];
          
          if (value === undefined || value === null) {
            passesAllFilters = false;
            break;
          }

          if (filterType === 'list') {
            if (!Array.isArray(filterValue)) {
              passesAllFilters = false;
              break;
            }
            
            if (Array.isArray(value)) {
              matches = filterValue.some(fv => value.includes(fv));
            } else {
              matches = filterValue.includes(value);
            }
          } else if (filterType === 'range') {
            if (typeof filterValue !== 'object' || filterValue === null || 
                filterValue.min === undefined || filterValue.max === undefined) {
              passesAllFilters = false;
              break;
            }
            
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
              passesAllFilters = false;
              break;
            }
            
            matches = numValue >= filterValue.min && numValue <= filterValue.max;
          } else if (filterType === 'boolean') {
            matches = value === filterValue;
          } else {
            passesAllFilters = false;
            break;
          }
        }

        if (!matches) {
          passesAllFilters = false;
          break;
        }
      }

      if (passesAllFilters) {
        filtered.push(product);
      }
    }

    return filtered;
  }

  /**
   * Применить фильтры к массиву продуктов
   * @param {Array} products
   * @returns {Array}
   */
  function applyFilters(products) {
    return applyFiltersInternal(products, state.active);
  }

  /**
   * Установить фильтр
   * @param {string} paramKey
   * @param {*} value
   */
  function setFilter(paramKey, value) {
    const filterConfig = state.available[paramKey];
    
    if (!filterConfig) {
      return;
    }

    const filterType = filterConfig.type;

    if (filterType === 'list') {
      if (!Array.isArray(value)) {
        return;
      }
      
      if (value.length === 0) {
        delete state.active[paramKey];
      } else {
        state.active[paramKey] = value;
      }
    } else if (filterType === 'range') {
      if (typeof value !== 'object' || value === null || 
          value.min === undefined || value.max === undefined) {
        return;
      }
      
      state.active[paramKey] = { min: value.min, max: value.max };
    } else if (filterType === 'boolean') {
      if (typeof value !== 'boolean') {
        return;
      }
      
      state.active[paramKey] = value;
    }
  }

  /**
   * Удалить фильтр
   * @param {string} paramKey
   */
  function removeFilter(paramKey) {
    if (state.active.hasOwnProperty(paramKey)) {
      delete state.active[paramKey];
    }
  }

  /**
   * Очистить все фильтры
   */
  function clearAll() {
    state.active = {};
  }

  /**
   * Сброс всех фильтров
   * @returns {void}
   */
  function resetFilters() {
    state.active = {};
  }

  /**
   * Получить активные фильтры
   * @returns {Object}
   */
  function getActiveFilters() {
    return { ...state.active };
  }

  /**
   * Получить типы ткани с подсчетом товаров
   * @param {Array} products - Массив всех товаров
   * @param {Object} activeFiltersCopy - Копия активных фильтров (без fabric_type для подсчета)
   * @returns {Array} Массив объектов {name, slug, count}
   */
  function getFabricTypesWithCount(products, activeFiltersCopy = null) {
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }
    
    // Используем переданную копию или создаем новую без fabric_type
    const filtersCopy = activeFiltersCopy !== null 
      ? { ...activeFiltersCopy }
      : (() => {
          const copy = { ...state.active };
          delete copy.fabric_type;
          return copy;
        })();
    
    // Применяем фильтры без fabric_type (НЕ мутируем state.active)
    const filteredProducts = applyFiltersInternal(products, filtersCopy);
    
    // Подсчитываем типы
    const typeCounts = new Map();
    
    for (const product of filteredProducts) {
      const typeSlug = getFabricTypeSlug(product);
      if (!typeSlug) continue;
      
      // Получаем оригинальное название для отображения
      const typeName = product.fabric_type || product.category;
      if (!typeName) continue;
      
      const current = typeCounts.get(typeSlug) || { name: typeName, slug: typeSlug, count: 0 };
      current.count += 1;
      typeCounts.set(typeSlug, current);
    }
    
    // Преобразуем в массив и сортируем
    return Array.from(typeCounts.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Получить цвета с подсчетом товаров
   * @param {Array} products - Массив всех товаров
   * @param {Object} activeFiltersCopy - Копия активных фильтров (без colors для подсчета)
   * @returns {Array} Массив объектов {name, slug, count}
   */
  function getColorsWithCount(products, activeFiltersCopy = null) {
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }
    
    // Используем переданную копию или создаем новую без colors
    const filtersCopy = activeFiltersCopy !== null 
      ? { ...activeFiltersCopy }
      : (() => {
          const copy = { ...state.active };
          delete copy.colors;
          return copy;
        })();
    
    // Применяем фильтры без colors (НЕ мутируем state.active)
    const filteredProducts = applyFiltersInternal(products, filtersCopy);
    
    // Подсчитываем цвета
    const colorCounts = new Map();
    
    for (const product of filteredProducts) {
      if (!Array.isArray(product.colors) || product.colors.length === 0) {
        continue;
      }
      
      for (const color of product.colors) {
        if (!color) continue;
        
        const colorSlug = toSlug(color);
        const current = colorCounts.get(colorSlug) || { name: color, slug: colorSlug, count: 0 };
        current.count += 1;
        colorCounts.set(colorSlug, current);
      }
    }
    
    // Преобразуем в массив и сортируем
    return Array.from(colorCounts.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Получить диапазон цен (min/max)
   * Не исключает товары с price_on_request (они видны БЕЗ фильтра)
   * @param {Array} products - Массив всех товаров
   * @param {Object} activeFiltersCopy - Копия активных фильтров (без price для подсчета)
   * @returns {Object|null} {min: number, max: number, currency: string} или null
   */
  function getPriceRange(products, activeFiltersCopy = null) {
    if (!Array.isArray(products) || products.length === 0) {
      return null;
    }
    
    // Используем переданную копию или создаем новую без price
    const filtersCopy = activeFiltersCopy !== null 
      ? { ...activeFiltersCopy }
      : (() => {
          const copy = { ...state.active };
          delete copy.price;
          return copy;
        })();
    
    // Применяем фильтры без price (НЕ мутируем state.active)
    const filteredProducts = applyFiltersInternal(products, filtersCopy);
    
    // Собираем цены (исключаем price_on_request = true из диапазона)
    const prices = [];
    
    for (const product of filteredProducts) {
      // Пропускаем товары с "Цена по запросу" при подсчете диапазона
      if (product.price_on_request === true) {
        continue;
      }
      
      // Пропускаем товары без цены
      if (product.price === null || product.price === undefined) {
        continue;
      }
      
      const price = parseFloat(product.price);
      if (!isNaN(price) && price > 0) {
        prices.push(price);
      }
    }
    
    if (prices.length === 0) {
      return null;
    }
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currency: '₽'
    };
  }

  /**
   * Получить диапазон метража (min/max)
   * @param {Array} products - Массив всех товаров
   * @param {Object} activeFiltersCopy - Копия активных фильтров (без fabric_meterage для подсчета)
   * @returns {Object|null} {min: number, max: number, unit: string} или null
   */
  function getMeterageRange(products, activeFiltersCopy = null) {
    if (!Array.isArray(products) || products.length === 0) {
      return null;
    }
    
    // Используем переданную копию или создаем новую без fabric_meterage
    const filtersCopy = activeFiltersCopy !== null 
      ? { ...activeFiltersCopy }
      : (() => {
          const copy = { ...state.active };
          delete copy.fabric_meterage;
          return copy;
        })();
    
    // Применяем фильтры без fabric_meterage (НЕ мутируем state.active)
    const filteredProducts = applyFiltersInternal(products, filtersCopy);
    
    // Собираем метраж
    const meterages = [];
    
    for (const product of filteredProducts) {
      if (product.fabric_meterage === null || product.fabric_meterage === undefined) {
        continue;
      }
      
      const meterage = parseFloat(product.fabric_meterage);
      if (!isNaN(meterage) && meterage > 0) {
        meterages.push(meterage);
      }
    }
    
    if (meterages.length === 0) {
      return null;
    }
    
    return {
      min: Math.min(...meterages),
      max: Math.max(...meterages),
      unit: 'м'
    };
  }

  return {
    // Существующие методы
    init,
    destroy: function() {
      // Очистить состояние
      state.available = {};
      state.active = {};
      _initialized = false;
      console.log('[CatalogFilters] Destroyed');
    },
    buildFilters,
    applyFilters,
    resetFilters,
    getActiveFilters,
    setFilter,
    removeFilter,
    clearAll,
    
    // Новые методы с подсчетом
    getFabricTypesWithCount,
    getColorsWithCount,
    getPriceRange,
    getMeterageRange
  };
})();

// Экспорт в глобальную область
if (typeof window !== 'undefined') {
  window.CatalogFilters = CatalogFilters;
}

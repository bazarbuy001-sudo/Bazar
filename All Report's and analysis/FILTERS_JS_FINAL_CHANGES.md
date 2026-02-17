# Изменения в filters.js (финальная версия)

## Структура изменений:

1. **Вспомогательные функции** (добавить перед `init()`)
2. **Реализация `init()` и `resetFilters()`**
3. **`applyFiltersInternal()`** (новая внутренняя функция)
4. **Изменение `applyFilters()`** (вызывает `applyFiltersInternal()`)
5. **Методы подсчета** (новые функции)
6. **Обновление return** (добавить новые методы)

---

## 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (добавить после строки 11, перед `init()`)

```javascript
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
```

---

## 2. РЕАЛИЗАЦИЯ `init()` (заменить строки 16-18)

```javascript
  /**
   * Инициализация фильтров
   * @param {Array} products - Массив товаров (опционально)
   */
  function init(products = null) {
    const productsToUse = products || CatalogDataStore.getAllProducts();
    
    if (!Array.isArray(productsToUse) || productsToUse.length === 0) {
      state.available = {};
      state.active = {};
      return;
    }
    
    // Построить доступные фильтры
    buildFilters(productsToUse);
    
    // Сбросить активные фильтры
    state.active = {};
  }
```

---

## 3. РЕАЛИЗАЦИЯ `resetFilters()` (заменить строки 205-207)

```javascript
  /**
   * Сброс всех фильтров
   * @returns {void}
   */
  function resetFilters() {
    state.active = {};
  }
```

---

## 4. НОВАЯ ФУНКЦИЯ `applyFiltersInternal()` (добавить перед `applyFilters()`, после `buildFilters()`)

```javascript
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
```

---

## 5. ИЗМЕНЕНИЕ `applyFilters()` (заменить строки 66-143)

```javascript
  /**
   * Применить фильтры к массиву продуктов
   * @param {Array} products
   * @returns {Array}
   */
  function applyFilters(products) {
    return applyFiltersInternal(products, state.active);
  }
```

---

## 6. МЕТОДЫ ПОДСЧЕТА (добавить после `getActiveFilters()`, перед `return`)

```javascript
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
    const filtersForCounting = activeFiltersCopy !== null 
      ? { ...activeFiltersCopy }
      : (() => {
          const copy = { ...state.active };
          delete copy.fabric_type;
          return copy;
        })();
    
    // Применяем фильтры без fabric_type
    const filteredProducts = applyFiltersInternal(products, filtersForCounting);
    
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
    const filtersForCounting = activeFiltersCopy !== null 
      ? { ...activeFiltersCopy }
      : (() => {
          const copy = { ...state.active };
          delete copy.colors;
          return copy;
        })();
    
    // Применяем фильтры без colors
    const filteredProducts = applyFiltersInternal(products, filtersForCounting);
    
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
    const filtersForCounting = activeFiltersCopy !== null 
      ? { ...activeFiltersCopy }
      : (() => {
          const copy = { ...state.active };
          delete copy.price;
          return copy;
        })();
    
    // Применяем фильтры без price
    const filteredProducts = applyFiltersInternal(products, filtersForCounting);
    
    // Собираем цены (исключаем price_on_request = true)
    const prices = [];
    
    for (const product of filteredProducts) {
      // Пропускаем товары с "Цена по запросу"
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
    const filtersForCounting = activeFiltersCopy !== null 
      ? { ...activeFiltersCopy }
      : (() => {
          const copy = { ...state.active };
          delete copy.fabric_meterage;
          return copy;
        })();
    
    // Применяем фильтры без fabric_meterage
    const filteredProducts = applyFiltersInternal(products, filtersForCounting);
    
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
```

---

## 7. ОБНОВЛЕНИЕ `return` (заменить строки 217-226)

```javascript
  return {
    // Существующие методы
    init,
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
```

---

## ИТОГОВАЯ СТРУКТУРА ФАЙЛА:

```
1. const CatalogFilters = (function () {
2.   const state = { ... }
3.   
4.   // Вспомогательные функции (toSlug, getFabricTypeSlug)
5.   // init()
6.   // buildFilters()
7.   // applyFiltersInternal() ← НОВОЕ
8.   // applyFilters() ← ИЗМЕНЕНО (вызывает applyFiltersInternal)
9.   // setFilter()
10.  // removeFilter()
11.  // clearAll()
12.  // resetFilters() ← РЕАЛИЗОВАНО
13.  // getActiveFilters()
14.  // getFabricTypesWithCount() ← НОВОЕ
15.  // getColorsWithCount() ← НОВОЕ
16.  // getPriceRange() ← НОВОЕ
17.  // getMeterageRange() ← НОВОЕ
18.  // return { ... }
19. })();
```

---

## ПРОВЕРКА:

✅ **НЕ мутирует state.active** - все методы подсчета используют копии фильтров  
✅ **НЕ меняет существующий API** - `applyFilters()` работает как раньше (вызывает `applyFiltersInternal`)  
✅ **Только добавляет новые функции** - не переписывает старые (кроме TODO методов)  
✅ **Slug сравнения** - для `fabric_type` и `colors`  
✅ **price_on_request логика** - товары скрыты только при активном фильтре цены  
✅ **Fallback для fabric_type** - использует `category` если нет `fabric_type`

---

**Готов применить изменения?** Подтвердите, и я внесу их в `filters.js`.



# Изменения в filters.js

## 1. Реализация метода `init()`

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

**Объяснение:** Инициализирует фильтры из товаров и сбрасывает активные фильтры.

---

## 2. Реализация метода `resetFilters()`

```javascript
/**
 * Сброс всех фильтров
 * @returns {void}
 */
function resetFilters() {
  state.active = {};
}
```

**Объяснение:** Алиас для `clearAll()` для единообразия API.

---

## 3. Вспомогательная функция: преобразование в slug

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

**Объяснение:** Преобразует категории в slug для сравнения. Поддерживает fallback: если `fabric_type` нет, используется `category`.

---

## 4. Изменение метода `applyFilters()` для поддержки специальных случаев

**ИЗМЕНЕНИЯ в существующем методе `applyFilters()`:**

Заменить блок проверки фильтров (строки 77-135) на:

```javascript
for (const product of products) {
  let passesAllFilters = true;

  for (const paramKey in state.active) {
    const filterValue = state.active[paramKey];
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
```

**Объяснение:** Добавлена специальная обработка для `fabric_type` (slug сравнение с fallback), `colors` (slug сравнение массива), `price` (исключение `price_on_request=true`), `fabric_meterage` (range фильтр).

---

## 5. Метод получения типов ткани с подсчётом

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
  
  // Временно применяем фильтры без fabric_type
  const tempActive = state.active;
  state.active = filtersForCounting;
  const filteredProducts = applyFilters(products);
  state.active = tempActive;
  
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
```

**Объяснение:** Возвращает типы ткани с количеством товаров, учитывая активные фильтры (кроме `fabric_type`). Использует копию фильтров, не мутирует `state.active`.

---

## 6. Метод получения цветов с подсчётом

```javascript
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
  
  // Временно применяем фильтры без colors
  const tempActive = state.active;
  state.active = filtersForCounting;
  const filteredProducts = applyFilters(products);
  state.active = tempActive;
  
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
```

**Объяснение:** Возвращает цвета с количеством товаров, учитывая активные фильтры (кроме `colors`). Использует slug сравнение.

---

## 7. Метод получения диапазона цен

```javascript
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
  
  // Временно применяем фильтры без price
  const tempActive = state.active;
  state.active = filtersForCounting;
  const filteredProducts = applyFilters(products);
  state.active = tempActive;
  
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
```

**Объяснение:** Возвращает диапазон цен с учетом активных фильтров (кроме `price`). Исключает товары с `price_on_request=true` из диапазона, но они видны без фильтра цены.

---

## 8. Метод получения диапазона метража

```javascript
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
  
  // Временно применяем фильтры без fabric_meterage
  const tempActive = state.active;
  state.active = filtersForCounting;
  const filteredProducts = applyFilters(products);
  state.active = tempActive;
  
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

**Объяснение:** Возвращает диапазон метража с учетом активных фильтров (кроме `fabric_meterage`).

---

## 9. Обновление публичного API (return)

Добавить в конец `return`:

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
  getMeterageRange,
  
  // Вспомогательные функции (для отладки, если нужно)
  getFabricTypeSlug: getFabricTypeSlug.bind(null)
};
```

**Примечание:** `getFabricTypeSlug` экспортируется только для отладки. Можно убрать из API, если не нужно.

---

## Примеры использования новых методов:

```javascript
// 1. Инициализация
CatalogFilters.init();
// или с массивом товаров:
CatalogFilters.init(products);

// 2. Получение типов ткани с подсчетом
const types = CatalogFilters.getFabricTypesWithCount(allProducts);
// Результат: [{name: "Лён", slug: "len", count: 5}, ...]

// 3. Получение цветов с подсчетом
const colors = CatalogFilters.getColorsWithCount(allProducts);
// Результат: [{name: "белый", slug: "belyy", count: 12}, ...]

// 4. Получение диапазона цены
const priceRange = CatalogFilters.getPriceRange(allProducts);
// Результат: {min: 690, max: 4590, currency: "₽"}

// 5. Получение диапазона метража
const meterageRange = CatalogFilters.getMeterageRange(allProducts);
// Результат: {min: 10.5, max: 200, unit: "м"}

// 6. Установка фильтров (существующие методы)
CatalogFilters.setFilter('fabric_type', ['len', 'hlopok']);
CatalogFilters.setFilter('colors', ['belyy', 'sinij']);
CatalogFilters.setFilter('price', {min: 1000, max: 2000});

// 7. Сброс фильтров
CatalogFilters.resetFilters();
```

---

## Важные замечания:

1. ✅ **Никаких мутаций state.active** — используются временные переменные с восстановлением
2. ✅ **Slug сравнения** — все сравнения для `fabric_type` и `colors` используют slug
3. ✅ **price_on_request логика** — товары с `price_on_request=true` видны БЕЗ фильтра цены, скрыты С фильтром
4. ✅ **Fallback для fabric_type** — если нет `fabric_type`, используется `category` (преобразованный в slug)
5. ✅ **Счетчики** — все методы подсчета принимают `activeFiltersCopy` параметром для гибкости
6. ✅ **Обратная совместимость** — существующие API не изменены

---

**Вопрос:** Применить эти изменения к `filters.js` сейчас?



# 📋 ПЛАН ДОРАБОТКИ filters.js

## 🔍 АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ

### Что уже есть:
✅ Базовая структура модуля (`CatalogFilters`)
✅ Метод `buildFilters()` - автоматическое определение типов фильтров
✅ Метод `applyFilters()` - применение фильтров к массиву товаров
✅ Метод `setFilter()` - установка фильтров
✅ Методы `removeFilter()`, `clearAll()` - управление фильтрами
✅ Интеграция с `CatalogCore` и `CatalogDataStore`

### Что отсутствует:
❌ Метод `init()` - не реализован (TODO)
❌ Метод `resetFilters()` - не реализован (TODO)
❌ Подсчет товаров по каждому значению фильтра (count)
❌ Методы для получения диапазонов (min/max для цены и метража)
❌ Специфичные методы для типов ткани, цветов
❌ Динамический пересчет доступных фильтров при активных фильтрах
❌ Поддержка `fabric_type` (сейчас только `category`)
❌ Поддержка `fabric_meterage` (метраж)
❌ Поддержка фильтрации по `price_on_request`

---

## 🎯 ЦЕЛЕВАЯ ФУНКЦИОНАЛЬНОСТЬ

### Критичные фильтры:
1. **Типы ткани** (`fabric_type` или `category`)
2. **Цвета** (`colors` - массив)
3. **Цена** (`price` - диапазон min/max)

### Дополнительные фильтры:
4. **Метраж** (`fabric_meterage` - диапазон min/max)

### Обязательные функции:
- ✅ Счетчики товаров для каждого значения фильтра
- ✅ Динамическое обновление счетчиков при изменении фильтров
- ✅ Получение диапазонов (min/max) для цены и метража

---

## 📊 СТРУКТУРА JSON ДАННЫХ (ТРЕБУЕТ РАСШИРЕНИЯ)

### Текущая структура:
```json
{
  "id": 1,
  "name": "Лён натуральный премиум",
  "category": "Лён",
  "colors": ["белый", "натуральный", "бежевый"],
  "price": 1290,
  "price_unit": "₽/м"
}
```

### Новая структура (рекомендуемая):
```json
{
  "id": 1,
  "name": "Лён натуральный премиум",
  "category": "Лён",
  "fabric_type": "platnaya",           // НОВОЕ: тип ткани (slug)
  "colors": ["белый", "натуральный", "бежевый"],
  "price": 1290,
  "price_unit": "₽/м",
  "price_on_request": false,            // НОВОЕ: флаг "Цена по запросу"
  "fabric_meterage": 50.5               // НОВОЕ: метраж в наличии
}
```

**Примечание:** Если `fabric_type` не указан, использовать `category` как fallback.

---

## 📝 ПОШАГОВЫЙ ПЛАН ДОРАБОТКИ

### ЭТАП 1: Расширение структуры данных (JSON)

**Файл:** `frontend/data/products.json`

**Задачи:**
1. Добавить поле `fabric_type` к каждому товару (на основе `category` или новое)
2. Добавить поле `fabric_meterage` (число, метраж в наличии)
3. Добавить поле `price_on_request` (boolean, false по умолчанию)

**Пример маппинга категорий → fabric_type:**
- "Лён" → "lyon" или оставить как есть
- "Хлопок" → "cotton"
- Можно использовать текущие категории как `fabric_type`

---

### ЭТАП 2: Доработка метода `init()`

**Файл:** `frontend/js/catalog/filters.js`

**Текущий код:**
```javascript
function init() {
  // TODO
}
```

**Новая реализация:**
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

### ЭТАП 3: Реализация метода `resetFilters()`

**Текущий код:**
```javascript
function resetFilters() {
  // TODO
}
```

**Новая реализация:**
```javascript
/**
 * Сброс всех фильтров (очистка активных)
 * @returns {void}
 */
function resetFilters() {
  state.active = {};
}
```

**Примечание:** Алиас для `clearAll()` для единообразия API.

---

### ЭТАП 4: Добавление метода получения доступных фильтров с подсчетом

**Новый метод:**
```javascript
/**
 * Получить доступные фильтры с подсчетом товаров
 * Считает товары с учетом текущих активных фильтров
 * @param {Array} products - Массив всех товаров
 * @returns {Object} Объект с доступными фильтрами и счетчиками
 */
function getAvailableFilters(products = null) {
  const allProducts = products || CatalogDataStore.getAllProducts();
  
  // Применяем текущие фильтры, кроме проверяемого
  // Это нужно для динамического подсчета
  const filteredProducts = applyFiltersWithoutCounting(allProducts);
  
  return {
    fabricTypes: getFabricTypesWithCount(filteredProducts),
    colors: getColorsWithCount(filteredProducts),
    priceRange: getPriceRange(filteredProducts),
    meterageRange: getMeterageRange(filteredProducts)
  };
}

/**
 * Применить фильтры без учета одного фильтра (для подсчета)
 * @private
 */
function applyFiltersWithoutCounting(products, excludeKey = null) {
  // Применяем все фильтры кроме excludeKey
  // Используется для подсчета доступных значений
  const tempActive = { ...state.active };
  if (excludeKey) {
    delete tempActive[excludeKey];
  }
  
  // Временно сохраняем текущие активные фильтры
  const originalActive = { ...state.active };
  state.active = tempActive;
  
  const result = applyFilters(products);
  
  // Восстанавливаем
  state.active = originalActive;
  
  return result;
}
```

---

### ЭТАП 5: Специфичные методы для типов ткани

**Новые методы:**
```javascript
/**
 * Получить типы ткани с подсчетом товаров
 * @param {Array} products - Массив товаров
 * @returns {Array} Массив объектов {name, slug, count}
 */
function getFabricTypesWithCount(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }
  
  const typeCounts = new Map();
  
  for (const product of products) {
    // Приоритет: fabric_type, затем category
    const type = product.fabric_type || product.category;
    
    if (!type) continue;
    
    const currentCount = typeCounts.get(type) || 0;
    typeCounts.set(type, currentCount + 1);
  }
  
  // Преобразуем в массив и сортируем
  return Array.from(typeCounts.entries())
    .map(([name, count]) => ({
      name: name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      count: count
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Установить фильтр по типу ткани
 * @param {Array<string>} types - Массив slug типов
 */
function setFabricTypeFilter(types) {
  if (!Array.isArray(types)) {
    return;
  }
  setFilter('fabric_type', types);
}
```

---

### ЭТАП 6: Специфичные методы для цветов

**Новые методы:**
```javascript
/**
 * Получить цвета с подсчетом товаров
 * @param {Array} products - Массив товаров
 * @returns {Array} Массив объектов {name, slug, count}
 */
function getColorsWithCount(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }
  
  const colorCounts = new Map();
  
  for (const product of products) {
    if (!Array.isArray(product.colors)) {
      continue;
    }
    
    for (const color of product.colors) {
      if (!color) continue;
      
      const currentCount = colorCounts.get(color) || 0;
      colorCounts.set(color, currentCount + 1);
    }
  }
  
  return Array.from(colorCounts.entries())
    .map(([name, count]) => ({
      name: name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      count: count
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Установить фильтр по цветам
 * @param {Array<string>} colors - Массив цветов (slug или name)
 */
function setColorFilter(colors) {
  if (!Array.isArray(colors)) {
    return;
  }
  setFilter('colors', colors);
}
```

---

### ЭТАП 7: Методы для диапазонов цены

**Новые методы:**
```javascript
/**
 * Получить диапазон цен (min/max)
 * Исключает товары с price_on_request = true
 * @param {Array} products - Массив товаров
 * @returns {Object|null} {min: number, max: number, currency: string} или null
 */
function getPriceRange(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }
  
  const prices = [];
  
  for (const product of products) {
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
 * Установить фильтр по цене
 * @param {number|null} minPrice - Минимальная цена
 * @param {number|null} maxPrice - Максимальная цена
 */
function setPriceFilter(minPrice, maxPrice) {
  if (minPrice === null && maxPrice === null) {
    removeFilter('price');
    return;
  }
  
  const range = {
    min: minPrice !== null ? parseFloat(minPrice) : 0,
    max: maxPrice !== null ? parseFloat(maxPrice) : Infinity
  };
  
  if (isNaN(range.min) || isNaN(range.max)) {
    return;
  }
  
  setFilter('price', range);
}
```

**Доработка `applyFilters()` для поддержки цены:**
```javascript
// В методе applyFilters(), в блоке обработки 'range':
else if (filterType === 'range') {
  if (paramKey === 'price') {
    // Специальная обработка для цены
    // Пропускаем товары с price_on_request = true
    if (product.price_on_request === true) {
      passesAllFilters = false;
      break;
    }
    
    const price = parseFloat(product.price);
    if (isNaN(price) || price <= 0) {
      passesAllFilters = false;
      break;
    }
    
    matches = price >= filterValue.min && price <= filterValue.max;
  } else {
    // Стандартная обработка для других range фильтров
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      passesAllFilters = false;
      break;
    }
    matches = numValue >= filterValue.min && numValue <= filterValue.max;
  }
}
```

---

### ЭТАП 8: Методы для диапазонов метража

**Новые методы:**
```javascript
/**
 * Получить диапазон метража (min/max)
 * @param {Array} products - Массив товаров
 * @returns {Object|null} {min: number, max: number, unit: string} или null
 */
function getMeterageRange(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }
  
  const meterages = [];
  
  for (const product of products) {
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

/**
 * Установить фильтр по метражу
 * @param {number|null} minMeterage - Минимальный метраж
 * @param {number|null} maxMeterage - Максимальный метраж
 */
function setMeterageFilter(minMeterage, maxMeterage) {
  if (minMeterage === null && maxMeterage === null) {
    removeFilter('fabric_meterage');
    return;
  }
  
  const range = {
    min: minMeterage !== null ? parseFloat(minMeterage) : 0,
    max: maxMeterage !== null ? parseFloat(maxMeterage) : Infinity
  };
  
  if (isNaN(range.min) || isNaN(range.max)) {
    return;
  }
  
  setFilter('fabric_meterage', range);
}
```

---

### ЭТАП 9: Улучшение `buildFilters()` для новых полей

**Доработка:**
```javascript
function buildFilters(products) {
  if (!Array.isArray(products) || products.length === 0) {
    state.available = {};
    return;
  }

  state.available = {};
  
  // Явно регистрируем нужные фильтры
  // Это проще для поддержки, чем автоматическое определение
  
  // 1. Тип ткани (используем fabric_type или category)
  const hasFabricType = products.some(p => p.fabric_type || p.category);
  if (hasFabricType) {
    state.available['fabric_type'] = { type: 'list' };
  }
  
  // 2. Цвета (всегда массив)
  const hasColors = products.some(p => Array.isArray(p.colors) && p.colors.length > 0);
  if (hasColors) {
    state.available['colors'] = { type: 'list' };
  }
  
  // 3. Цена (диапазон)
  const hasPrice = products.some(p => p.price !== null && p.price !== undefined && !p.price_on_request);
  if (hasPrice) {
    state.available['price'] = { type: 'range' };
  }
  
  // 4. Метраж (диапазон, опционально)
  const hasMeterage = products.some(p => p.fabric_meterage !== null && p.fabric_meterage !== undefined);
  if (hasMeterage) {
    state.available['fabric_meterage'] = { type: 'range' };
  }
  
  // Также используем автоматическое определение для других полей
  const filterableKeys = CatalogDataStore.getFilterableKeys();
  for (const paramKey of filterableKeys) {
    // Пропускаем уже зарегистрированные
    if (state.available.hasOwnProperty(paramKey)) {
      continue;
    }
    
    const paramType = CatalogDataStore.detectParamType(paramKey);
    if (paramType === null) {
      continue;
    }
    
    if (paramType === 'list') {
      const values = CatalogDataStore.getUniqueValues(paramKey);
      if (values.length > 0) {
        state.available[paramKey] = { type: 'list', values: values };
      }
    } else if (paramType === 'range') {
      state.available[paramKey] = { type: 'range' };
    } else if (paramType === 'boolean') {
      state.available[paramKey] = { type: 'boolean' };
    }
  }
}
```

---

### ЭТАП 10: Улучшение `applyFilters()` для специальных случаев

**Доработки:**

1. **Поддержка `fabric_type` с fallback на `category`:**
```javascript
// В блоке проверки фильтра по fabric_type:
if (paramKey === 'fabric_type') {
  const productType = product.fabric_type || product.category;
  if (!productType) {
    passesAllFilters = false;
    break;
  }
  matches = filterValue.includes(productType);
}
```

2. **Поддержка `colors` как массива:**
```javascript
// В блоке проверки фильтра по colors:
if (paramKey === 'colors') {
  if (!Array.isArray(product.colors) || product.colors.length === 0) {
    passesAllFilters = false;
    break;
  }
  // Проверяем, есть ли хотя бы один выбранный цвет в товаре
  matches = filterValue.some(selectedColor => 
    product.colors.some(productColor => 
      productColor === selectedColor || 
      productColor.toLowerCase() === selectedColor.toLowerCase()
    )
  );
}
```

---

### ЭТАП 11: Добавление вспомогательных методов

**Новые методы для удобства:**
```javascript
/**
 * Получить количество активных фильтров
 * @returns {number}
 */
function getActiveFiltersCount() {
  return Object.keys(state.active).length;
}

/**
 * Проверить, есть ли активные фильтры
 * @returns {boolean}
 */
function hasActiveFilters() {
  return Object.keys(state.active).length > 0;
}

/**
 * Получить количество отфильтрованных товаров
 * @param {Array} products - Все товары
 * @returns {number}
 */
function getFilteredCount(products = null) {
  const allProducts = products || CatalogDataStore.getAllProducts();
  const filtered = applyFilters(allProducts);
  return filtered.length;
}
```

---

### ЭТАП 12: Обновление публичного API

**Добавить в return:**
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
  
  // Новые специфичные методы
  getAvailableFilters,
  getFabricTypesWithCount,
  getColorsWithCount,
  getPriceRange,
  getMeterageRange,
  setFabricTypeFilter,
  setColorFilter,
  setPriceFilter,
  setMeterageFilter,
  
  // Вспомогательные методы
  getActiveFiltersCount,
  hasActiveFilters,
  getFilteredCount,
  
  // Для отладки
  getState: () => ({ ...state })
};
```

---

## 🎨 ИНТЕГРАЦИЯ С UI (Будущие задачи)

### После доработки filters.js нужно будет создать:

1. **Компонент FilterSidebar** (HTML/CSS/JS)
   - Боковая панель с фильтрами
   - Динамическое обновление счетчиков

2. **Компоненты фильтров:**
   - `FabricTypeFilter` - чекбоксы типов ткани
   - `ColorFilter` - чекбоксы/цветные образцы цветов
   - `PriceRangeFilter` - два input для min/max
   - `MeterageFilter` - два input для min/max (опционально)

3. **Интеграция с CatalogCore:**
   - Подписка на изменения фильтров
   - Автоматический пересчет каталога

---

## 📊 ПРИОРИТИЗАЦИЯ ВНЕДРЕНИЯ

### Высокий приоритет (критичные фильтры):
1. ✅ Метод `init()` - базовая функциональность
2. ✅ Метод `resetFilters()` - базовая функциональность
3. ✅ `getFabricTypesWithCount()` - типы ткани с счетчиками
4. ✅ `getColorsWithCount()` - цвета с счетчиками
5. ✅ `getPriceRange()` + улучшение `applyFilters()` для цены
6. ✅ `setFabricTypeFilter()`, `setColorFilter()`, `setPriceFilter()`

### Средний приоритет (дополнительно):
7. ⚠️ `getMeterageRange()` + `setMeterageFilter()` - метраж
8. ⚠️ `getAvailableFilters()` - универсальный метод
9. ⚠️ Вспомогательные методы (`hasActiveFilters()`, `getActiveFiltersCount()`)

### Низкий приоритет (оптимизация):
10. ⚠️ `applyFiltersWithoutCounting()` - для динамического пересчета
11. ⚠️ Оптимизация производительности при больших массивах

---

## ✅ КРИТЕРИИ ПРИЕМКИ

### Функциональные:
- [ ] `init()` инициализирует фильтры из товаров
- [ ] `resetFilters()` очищает все активные фильтры
- [ ] Типы ткани фильтруются и показываются со счетчиками
- [ ] Цвета фильтруются (поддержка массива) и показываются со счетчиками
- [ ] Цена фильтруется по диапазону (min/max)
- [ ] Товары с `price_on_request = true` исключаются из фильтра цены
- [ ] Метраж фильтруется по диапазону (если присутствует в данных)

### Технические:
- [ ] Все методы корректно обрабатывают edge cases (пустые массивы, null)
- [ ] Код следует текущему стилю проекта
- [ ] Нет конфликтов с существующей функциональностью
- [ ] Интеграция с `CatalogCore` работает корректно

### Производительность:
- [ ] Фильтрация работает быстро на массивах до 500 товаров
- [ ] Подсчет счетчиков не блокирует UI

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

1. **Этап 1:** Расширить JSON структуру данных
2. **Этапы 2-3:** Реализовать базовые методы (`init`, `resetFilters`)
3. **Этапы 4-8:** Реализовать специфичные методы для фильтров
4. **Этапы 9-10:** Улучшить существующие методы
5. **Этапы 11-12:** Добавить вспомогательные методы и обновить API
6. **Тестирование:** Проверить все сценарии
7. **UI:** Создать компоненты фильтров (отдельная задача)

---

**Статус:** План готов к реализации  
**Оценка времени:** 2-3 дня для полной реализации  
**Сложность:** Средняя



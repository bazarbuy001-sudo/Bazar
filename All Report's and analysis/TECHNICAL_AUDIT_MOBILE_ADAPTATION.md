# ПОЛНЫЙ ТЕХНИЧЕСКИЙ АУДИТ: МОБИЛЬНАЯ АДАПТАЦИЯ

**Проект:** Bazar Buy (e-commerce)  
**Технологии:** HTML5, CSS3, Vanilla JavaScript (ES6+)  
**Дата аудита:** 2024  
**Цель:** Безопасное планирование мобильной адаптации

---

## АРХИТЕКТУРА

### Структура проекта

```
frontend/
├── index.html              # Главная страница (каталог товаров)
├── catalog.html            # Страница каталога с фильтрами
├── product.html            # Страница отдельного товара
├── cart.html               # Корзина
├── delivery.html           # Доставка
├── discounts.html          # Оптовые скидки
├── faq.html                # FAQ
├── videos.html             # Видео-обзоры
│
├── css/
│   ├── styles.css          # Основные стили (997 строк)
│   ├── product-popup.css   # Стили попапа товара (1033 строки)
│   ├── megaMenu.css        # Стили мега-меню (322 строки)
│   └── Старый код.css      # Архивный файл
│
├── js/
│   ├── catalog.js          # Legacy модуль каталога (proxy)
│   ├── product-popup.js    # Попап товара (1703 строки) ⚠️ КРУПНЫЙ
│   ├── product.js          # Страница товара
│   ├── cart-store.js       # Хранилище корзины
│   ├── stories.js          # Видео-карусель
│   │
│   ├── catalog/            # Модули каталога (новая архитектура)
│   │   ├── dataStore.js           # Хранилище данных (ядро)
│   │   ├── catalog-core.js        # Ядро каталога
│   │   ├── eventBus.js            # Event Bus (PubSub)
│   │   ├── filters.js             # Фильтрация
│   │   ├── sorting.js             # Сортировка
│   │   ├── pagination.js          # Пагинация
│   │   ├── paginationFix.js       # Патч пагинации
│   │   ├── productCard.js         # Рендеринг карточек
│   │   ├── dataStoreNavigation.js # Расширение DataStore
│   │   ├── integration.js         # Точки интеграции
│   │   └── data-sources/
│   │       ├── localJSONSource.js
│   │       └── wordpressRESTSource.js
│   │
│   ├── menu/               # Меню
│   │   ├── catalogButton.js  # Кнопка каталога
│   │   └── megaMenu.js       # Мега-меню
│   │
│   ├── search/             # Поиск
│   │   └── searchController.js
│   │
│   └── seo/                # SEO
│       └── seoController.js
│
├── cabinet/                # Личный кабинет (отдельное SPA)
│   ├── index.html
│   ├── cabinet.js          # Логика кабинета
│   ├── cabinet.css
│   ├── cabinet-store.js    # State management
│   └── cabinet-api.js      # API клиент
│
└── data/
    └── products.json       # Данные товаров
```

### Модульная структура

**Каталог:**
- **Старая система:** `catalog.js` (legacy proxy к CatalogCore)
- **Новая система:** `js/catalog/*` (модульная архитектура)
  - `CatalogDataStore` - единый источник данных
  - `CatalogCore` - ядро логики
  - `CatalogEventBus` - система событий
  - `CatalogFilters`, `CatalogSorting`, `CatalogPagination` - модули

**Корзина:**
- `CartStore` (js/cart-store.js) - хранилище в памяти + localStorage
- События: `product:addToCart`, `cart:updated`

**Popup товара:**
- `ProductPopup` (js/product-popup.js) - монолитный модуль 1703 строки

**Header:**
- **Inline JavaScript** в `index.html` (строки 1735-1858)
- Функции: `initHeader()`, `centerBrandOnCatalogBtn()`, `handleScroll()`

**Кабинет:**
- Отдельное SPA приложение
- `CabinetStore`, `CabinetAPI`
- Рендеринг через `innerHTML` в `#cabinet-app`

**Mega Menu:**
- `CatalogButton` + `MegaMenu` модули
- Зависит от `CatalogDataStore.getNavigation()`

### Глобальные объекты (window.*)

```javascript
// Ядро каталога
window.CatalogDataStore      // js/catalog/dataStore.js
window.CatalogCore           // js/catalog/catalog-core.js
window.CatalogEventBus       // js/catalog/eventBus.js
window.CatalogFilters        // js/catalog/filters.js
window.CatalogSorting        // js/catalog/sorting.js
window.CatalogPagination     // js/catalog/pagination.js
window.CatalogProductCard    // js/catalog/productCard.js

// UI модули
window.ProductPopup          // js/product-popup.js
window.CartStore             // js/cart-store.js
window.SearchController      // js/search/searchController.js
window.SEOController         // js/seo/seoController.js
window.CatalogButton         // js/menu/catalogButton.js
window.MegaMenu              // js/menu/megaMenu.js

// Legacy
window.Catalog               // js/catalog.js (proxy)
```

### Точки входа JavaScript

**index.html:**
1. Inline script header (1735-1858) - инициализация header
2. Inline script video carousel (1607-1750) - stories
3. DOMContentLoaded (1898+) - загрузка каталога, инициализация модулей
4. Подключение модулей: `CatalogButton`, `MegaMenu`, `SearchController`, `SEOController`

**catalog.html:**
1. DOMContentLoaded (1160+) - инициализация каталога, фильтров
2. Подключение: `SearchController`, `SEOController`

**cabinet/index.html:**
1. DOMContentLoaded - инициализация `CabinetStore`, рендеринг UI

---

## КРИТИЧЕСКИЕ ФАЙЛЫ

### Ядро логики (НЕ ТРОГАТЬ)

1. **js/catalog/dataStore.js**
   - Единый источник данных каталога
   - API: `load()`, `getAllProducts()`, `getNavigation()`
   - Используется всеми модулями

2. **js/catalog/eventBus.js**
   - Система событий (PubSub)
   - События: `catalog:loaded`, `catalog:filtered`, `menu:open`, `search:change`
   - Критичен для интеграции модулей

3. **js/catalog/catalog-core.js**
   - Ядро логики каталога
   - Фильтрация, сортировка, пагинация

4. **js/product-popup.js** (1703 строки)
   - Монолитный модуль попапа
   - Управление состоянием, рендеринг, события

### Критические функции размера/позиционирования

**index.html (header, inline JS):**

```javascript
// Строки 1751-1798
function centerBrandOnCatalogBtn() {
    // КРИТИЧЕСКАЯ ФУНКЦИЯ - вычисляет позиции через getBoundingClientRect()
    const headerRow1Rect = headerRow1.getBoundingClientRect();
    const catalogBtnRect = catalogBtn.getBoundingClientRect();
    const cartBtnRect = cartBtn.getBoundingClientRect();
    
    // Устанавливает CSS переменные:
    headerRow1.style.setProperty('--brand-center-left', ...);
    headerRow1.style.setProperty('--nav-center-left', ...);
    headerRow1.style.setProperty('--line-start', ...);
    headerRow1.style.setProperty('--line-width', ...);
}

// Строка 1845
window.addEventListener('resize', () => {
    centerBrandOnCatalogBtn(); // Пересчет при ресайзе
});
```

**js/product-popup.js:**

```javascript
// Строки 1341-1352
function showAddToCartHint() {
    const buttonRect = button.getBoundingClientRect();
    const hintWidth = hintContent.offsetWidth || hintContent.scrollWidth || 250;
    const leftPosition = buttonRect.left - hintWidth - 15;
    // Позиционирование подсказки
}
```

**index.html (video carousel):**

```javascript
// Строки 1684-1720
function updateVideoPositions() {
    const cards = document.querySelectorAll('.video-card');
    // Вычисление позиций карточек через индексы
}
```

### Функции с window.scroll/resize

**index.html:**
- `handleScroll()` (1801-1809) - обработка скролла для sticky header
- `window.addEventListener('resize', centerBrandOnCatalogBtn)` (1845) - пересчет позиций header

**catalog.html:**
- `window.addEventListener('scroll', ...)` (2049) - sticky header (дубликат логики)

### Функции, которые нельзя трогать

1. **centerBrandOnCatalogBtn()** (index.html:1751) - критична для header
2. **handleScroll()** (index.html:1801) - управление sticky header
3. **CatalogDataStore.getAllProducts()** - используется везде
4. **CatalogEventBus.emit/on** - система событий
5. **ProductPopup.open()** - открытие попапа
6. Все функции в `catalog-core.js` - ядро логики

---

## HEADER (ДЕТАЛЬНО)

### Структура HTML

```html
<header class="site-header">
  <div class="nav-container">  <!-- 60% ширины, центрирован -->
    <div id="headerRow1" class="header-row-1">
      <span class="row1-brand">Bazar Buy</span>
      <nav class="row1-nav">...</nav>
    </div>
  </div>
  
  <div id="headerSticky" class="header-sticky">
    <div class="nav-container">
      <div class="header-row-2">
        <span class="logo-icon">...</span>
        <span class="row2-brand">Bazar Buy</span>
        <button class="catalog-btn">...</button>
        <div class="mega-menu">...</div>
        <div class="search-box">...</div>
        <span class="row2-contacts">Контакты</span>
        <div id="cabinet-header-btn"></div>
        <button class="cart-btn">...</button>
      </div>
    </div>
  </div>
</header>
```

### JavaScript функции (index.html:1735-1858)

**initHeader()** - главная функция инициализации:
- Находит элементы: `#headerSticky`, `#headerRow1`, `.header-row-2`, `.catalog-btn`, `.row1-brand`
- Навешивает обработчики: `scroll`, `resize`
- Использует `ResizeObserver` для отслеживания готовности layout

**centerBrandOnCatalogBtn()** - КРИТИЧЕСКАЯ функция:
- Вычисляет позиции через `getBoundingClientRect()`
- Устанавливает CSS переменные:
  - `--brand-center-left` - позиция "Bazar Buy"
  - `--nav-center-left` - позиция навигации (сдвиг -15px от центра)
  - `--line-start` - начало линии разделителя
  - `--line-width` - ширина линии
- Добавляет классы: `line-ready`, `positioned`, `ready`
- Вызывается при: инициализации, resize, через ResizeObserver

**handleScroll()** - обработка скролла:
- Порог: `window.scrollY > 60`
- Добавляет классы: `scrolled` (на `#headerSticky`), `collapsed` (на `#headerRow1`)
- Удаляет классы при scrollY <= 60

### CSS классы (динамически добавляются JS)

**Классы состояний:**
- `.scrolled` - на `#headerSticky` при скролле > 60px
- `.collapsed` - на `#headerRow1` при скролле > 60px (скрывает строку)
- `.line-ready` - на `#headerRow1` после вычисления позиций
- `.positioned` - на `.row1-brand` после позиционирования
- `.ready` - на `.header-row-2` после инициализации

**CSS правила (index.html стили):**
- `.header-sticky.scrolled` - тень, стили для sticky состояния
- `.header-row-1.collapsed` - `max-height: 0`, `opacity: 0`, `overflow: hidden`
- `.row1-brand.positioned` - `opacity: 1`, `visibility: visible`
- `.header-row-1.line-ready::after` - показывает линию разделителя

### Sticky header реализация

**CSS:**
```css
.site-header {
    position: sticky;
    top: 0;
    z-index: 10001;
}

.header-sticky {
    background: white;
    border-bottom: 1px solid var(--border-color);
}

.header-sticky.scrolled {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
```

**JavaScript:**
- При scrollY > 60: добавляется класс `scrolled`, строка 1 сворачивается
- При scrollY <= 60: классы удаляются, строка 1 разворачивается

### Математические вычисления

**centerBrandOnCatalogBtn()** вычисляет:

1. **Позиция "Bazar Buy":**
   ```javascript
   const catalogBtnLeft = catalogBtnRect.left - headerRow1Rect.left;
   // Устанавливается --brand-center-left
   ```

2. **Позиция навигации (центр между кнопками):**
   ```javascript
   const centerBetweenBtns = (catalogBtnEnd + cartBtnStart) / 2;
   const navCenterPosition = centerBetweenBtns - headerRow1Rect.left - 15;
   // Сдвиг на 15px влево от центра
   // Устанавливается --nav-center-left
   ```

3. **Линия разделителя:**
   ```javascript
   const lineStart = catalogBtnRect.left - headerRow1Rect.left;
   const lineEnd = cartBtnRect.left + cartBtnRect.width - headerRow1Rect.left;
   const lineWidth = lineEnd - lineStart;
   // Устанавливаются --line-start, --line-width
   ```

### Элементы header, используемые в JS

**По ID (getElementById):**
- `#headerSticky` - контейнер sticky части
- `#headerRow1` - первая строка header

**По классам (querySelector):**
- `.header-row-2` - вторая строка header
- `.catalog-btn` - кнопка каталога (ResizeObserver наблюдает за ней)
- `.row1-brand` - текст "Bazar Buy" в первой строке
- `.cart-btn` - кнопка корзины
- `.row1-nav` - навигация в первой строке

### Что сломается при изменении HTML структуры

**КРИТИЧЕСКИЕ изменения:**

1. **Изменение ID `#headerSticky`, `#headerRow1`:**
   - JS не найдет элементы, инициализация провалится
   - Sticky header не будет работать

2. **Изменение классов `.header-row-2`, `.catalog-btn`, `.cart-btn`, `.row1-brand`:**
   - `centerBrandOnCatalogBtn()` не найдет элементы
   - Позиционирование сломается

3. **Изменение порядка элементов в `.header-row-2`:**
   - Вычисления `getBoundingClientRect()` будут неверными
   - Позиции "Bazar Buy" и навигации будут неправильными

4. **Изменение структуры `.nav-container`:**
   - Вычисления позиций относительно `headerRow1Rect` сломаются
   - CSS переменные будут устанавливаться неправильно

5. **Удаление/изменение `.header-row-1`:**
   - Вся логика позиционирования сломается
   - Sticky header не будет работать

**НЕЛЬЗЯ:**
- Менять ID элементов
- Менять классы, используемые в JS
- Менять порядок кнопок в header-row-2
- Удалять `.nav-container`
- Менять структуру вложенности

---

## POPUP

### Где создаётся

**Файл:** `js/product-popup.js`

**Функция:** `open(productId)` (строка ~900+)
- Проверяет наличие `popupElement`
- Если нет - создает через `createPopupElement()`

**createPopupElement()** (строка ~1100+):
- Создает `<div id="productPopup" class="product-popup">`
- Вставляет в `document.body`
- Рендерит HTML через `renderPopup()`

### Как открывается

**Триггеры:**
1. Клик на `.product-card` → `Catalog.handleProductClick()` → `ProductPopup.open(productId)`
2. Прямой вызов: `ProductPopup.open(productId)`

**Процесс:**
1. Загружает товар через `loadProduct(productId)` (использует `CatalogDataStore`)
2. Обновляет state: `state.product`, `state.isOpen = true`
3. Рендерит HTML через `renderPopup()`
4. Добавляет класс `.product-popup--open` (если используется)
5. Привязывает события через `bindEvents()`
6. Блокирует скролл body (если реализовано)

### Data-атрибуты

**В HTML попапа (рендерятся динамически):**

```html
<!-- Действия -->
data-action="close"                    # Закрытие
data-action="addToCart"                # Добавление в корзину
data-action="selectColor"              # Выбор цвета
data-action="selectCurrency"           # Выбор валюты
data-action="selectImage"              # Выбор изображения
data-action="toggleCurrencyMenu"       # Переключение меню валют
data-action="increaseMeters"           # Увеличение метров
data-action="decreaseMeters"           # Уменьшение метров
data-action="increaseRolls"            # Увеличение рулонов
data-action="decreaseRolls"            # Уменьшение рулонов
data-action="expandColors"             # Развернуть цвета
data-action="collapseColors"           # Свернуть цвета

<!-- Данные -->
data-index="${index}"                  # Индекс цвета/изображения
data-currency-code="${code}"           # Код валюты
data-action="stopPropagation"          # Остановка всплытия события
```

**Обработка:** `handleClick()` (строка 790+) - использует `target.dataset.action`

### Размеры и позиционирование

**CSS (product-popup.css):**
- `.product-popup` - `position: fixed`, `top: 0`, `left: 0`, `width: 100%`, `height: 100%`
- `.product-popup__container` - центрирование через flexbox
- На мобильных (768px): `width: 95%`, `max-height: 95vh`, `overflow-y: auto`

**JavaScript:**
- `showAddToCartHint()` (1341+) - вычисляет позицию подсказки через `getBoundingClientRect()`
- Использует `offsetWidth`, `scrollWidth` для расчета ширины подсказки
- Позиционирование: `left: buttonRect.left - hintWidth - 15`

### Закрытие попапа

**Триггеры:**
1. Клик на overlay (`.product-popup-overlay` или `#productPopup`)
2. Клик на кнопку с `data-action="close"`
3. Нажатие `Escape` (обработчик `handleKeydown`)

**Логика (handleClick, строка 813+):**
```javascript
const clickedOnOverlay = target.classList.contains('product-popup-overlay') ||
                         target.id === 'productPopup';
const clickedInsidePopup = target.closest('.product-popup__container') || 
                           target.closest('.product-popup');
if (clickedOnOverlay && !clickedInsidePopup) {
    close();
}
```

**Зависимости:**
- Классы: `.product-popup-overlay`, `.product-popup__container`
- ID: `#productPopup`
- Метод `closest()` для проверки вложенности

**Что сломается:**
- Изменение ID `#productPopup`
- Изменение классов `.product-popup-overlay`, `.product-popup__container`
- Изменение структуры вложенности (overlay → container)

---

## КАТАЛОГ

### Логика фильтрации

**Файл:** `catalog.html` (inline JS, строки 1159+)

**Состояние фильтров:**
```javascript
const filtersState = {
    color: null,              // Один цвет
    fabricType: null,         // Один тип ткани
    composition: [],          // Массив составов
    density: { min: null, max: null },
    price: { min: null, max: null },
    status: []                // Массив статусов
};
```

**Функции:**
- `applyFiltersLocally(products)` (1579+) - применяет фильтры к массиву товаров
- `applyFilters()` (1483+) - обновляет URL, вызывает `loadCatalog()`
- `loadCatalog()` (1519+) - загружает товары, применяет фильтры, рендерит

**Интеграция:**
- Использует `CatalogDataStore.getAllProducts()` для получения данных
- Использует `CatalogProductCard.render()` для рендеринга карточек
- Слушает событие `catalog:filtered` от `SearchController`

### Чекбоксы

**Фильтр составов (initCompositionFilter, строка 1315+):**
- Селектор: `#filterComposition input[type="checkbox"]`
- Обработчик: `change` событие
- Логика: добавляет/удаляет значения из `filtersState.composition[]`
- При изменении: вызывает `applyFilters()`

**Фильтр статусов (initStatusFilter, строка 1440+):**
- Селектор: `#filterStatus input[type="checkbox"]`
- Аналогичная логика с `filtersState.status[]`

**Другие фильтры (НЕ чекбоксы):**
- Цвет: кнопки (`.color-swatch`) - single select
- Тип ткани: кнопки (`.filter-btn`) - single select
- Плотность: range sliders + inputs
- Цена: range sliders + inputs

### Селекторы (критические)

**ID контейнеров:**
- `#catalogGrid` - контейнер для товаров (рендеринг)
- `#sortSelect` - селект сортировки
- `#filterColors` - контейнер цветов (динамическое создание)
- `#filterFabricType` - контейнер типов ткани
- `#filterComposition` - контейнер составов
- `#filterStatus` - контейнер статусов
- `#densityMin`, `#densityMax` - inputs плотности
- `#densitySliderMin`, `#densitySliderMax` - слайдеры плотности
- `#priceMin`, `#priceMax` - inputs цены
- `#priceSliderMin`, `#priceSliderMax` - слайдеры цены
- `#filterResetBtn` - кнопка сброса

**Классы:**
- `.product-card` - карточки товаров (обработчики клика)
- `.color-swatch` - кнопки цветов
- `.filter-btn` - кнопки фильтров
- `.catalog-grid` - сетка товаров
- `.catalog-loading`, `.catalog-error`, `.catalog-empty` - состояния

### Зависимость от структуры HTML

**КРИТИЧЕСКИЕ зависимости:**

1. **ID контейнеров** - JS использует `getElementById()`:
   - Изменение ID сломает инициализацию
   - Особенно критично: `#catalogGrid`, `#sortSelect`, `#filterColors`

2. **Структура фильтров:**
   - `#filterColors` должен существовать для динамического создания кнопок
   - `#filterFabricType .filter-btn` должны иметь `data-fabric-type`
   - `#filterComposition input[type="checkbox"]` должны иметь `value`

3. **Карточки товаров:**
   - Класс `.product-card` обязателен для обработчиков клика
   - Data-атрибут `data-product-id` используется для открытия попапа

**Что сломается:**
- Изменение ID любого контейнера фильтров
- Изменение структуры `.catalog-grid`
- Изменение класса `.product-card`
- Удаление data-атрибутов на кнопках фильтров

---

## КАБИНЕТ

### Генерация HTML через JS

**Файл:** `cabinet/cabinet.js`

**Контейнер:** `#cabinet-app` (cabinet/index.html:81)

**Рендеринг:**
- Все HTML генерируется через `innerHTML` в `#cabinet-app`
- Функции рендеринга: `renderAuthPage()`, `renderCabinetPage()`, `renderOrderPage()` и т.д.
- Нет статического HTML (кроме контейнера)

### Обязательные контейнеры

**Главный контейнер:**
- `#cabinet-app` - корневой контейнер (ОБЯЗАТЕЛЕН)

**Внутренние контейнеры (генерируются динамически):**
- Структура создается через JS, контейнеры создаются при рендеринге
- Нет жестких зависимостей от структуры (все генерируется)

### CSS классы в логике

**Использование классов:**
- Классы используются для стилизации, не для логики
- Нет критических зависимостей от классов
- Все события привязываются к элементам напрямую

**Вывод:** Кабинет изолирован, можно менять CSS свободно (кроме `#cabinet-app`)

---

## MEGA MENU

### Логика

**Файлы:**
- `js/menu/catalogButton.js` - кнопка каталога (открытие/закрытие)
- `js/menu/megaMenu.js` - рендеринг меню, навигация

**Инициализация:**
- `CatalogButton.init()` - находит `.catalog-btn`, `.mega-menu`
- `MegaMenu.init('.mega-menu')` - рендеринг структуры

### События

**CatalogButton:**
- `click` на `.catalog-btn` → открытие/закрытие меню
- `click` вне меню → закрытие
- `keydown` (Escape) → закрытие
- Эмитит: `menu:open`, `menu:close` через `CatalogEventBus`

**MegaMenu:**
- `mouseenter` на категории → рендеринг подкатегорий
- `click` на категории/подкатегории → навигация
- Слушает: `menu:open`, `menu:close`, `catalog:loaded`

### Обязательные классы

**Структура (рендерится через createMenuHTML, megaMenu.js:236):**
```html
.mega-menu
  .mega-menu__inner
    .mega-menu__column--categories
      .mega-menu__categories (ul)
        .mega-menu__category-item (li)
          .mega-menu__category-link (a)
    .mega-menu__column--subcategories
      .mega-menu__subcategories (ul)
        .mega-menu__subcategory-item (li)
    .mega-menu__column--fabric-types
      .mega-menu__fabric-types (ul)
```

**Классы состояний:**
- `is-open` - на `.mega-menu` (открыто)
- `is-active` - на `.catalog-btn` (активна кнопка)
- `is-active` - на `.mega-menu__category-item`, `.mega-menu__subcategory-item` (активная категория)
- `no-scroll` - на `body` (блокировка скролла)

**Data-атрибуты:**
- `data-category-id` - ID категории
- `data-subcategory-id` - ID подкатегории
- `data-fabric-type-id` - ID типа ткани

**Селекторы (SELECTORS в коде):**
- `.mega-menu`
- `.mega-menu__categories`
- `.mega-menu__subcategories`
- `.mega-menu__fabric-types`
- `.mega-menu__category-item`
- `.mega-menu__subcategory-item`
- `.mega-menu__fabric-type-item`

**Что сломается:**
- Изменение классов структуры (рендеринг зависит от них)
- Изменение классов состояний (`is-open`, `is-active`)
- Изменение селекторов в константах SELECTORS

---

## ПРОИЗВОДИТЕЛЬНОСТЬ

### Тяжёлые JS-файлы

**По размеру (оценка):**
1. `product-popup.js` - 1703 строки ⚠️ САМЫЙ КРУПНЫЙ
2. `catalog-core.js` - ~500+ строк
3. `catalog.js` (legacy) - ~521 строка
4. `megaMenu.js` - ~641 строка
5. `cabinet.js` - ~500+ строк

**По сложности логики:**
1. `product-popup.js` - монолитный модуль, много состояния, рендеринг
2. Header inline JS (index.html) - вычисления позиций, ResizeObserver
3. `catalog.html` inline JS - большая логика фильтрации, рендеринг

### Тяжёлые DOM-операции

**Потенциально тяжелые:**

1. **Рендеринг каталога (catalog.html:1519+):**
   - `catalogGrid.innerHTML = products.map(...).join('')` - массовая вставка HTML
   - При большом количестве товаров - медленно

2. **Рендеринг попапа (product-popup.js):**
   - `renderPopup()` - большой HTML шаблон
   - Множественные `innerHTML` операций

3. **Mega Menu рендеринг (megaMenu.js):**
   - `innerHTML` для категорий, подкатегорий, типов ткани
   - Три колонки рендерятся отдельно

4. **Video carousel (index.html:1622+):**
   - `carousel.innerHTML = ''` + цикл создания карточек
   - `appendChild` в цикле

5. **Header вычисления (index.html:1751+):**
   - `getBoundingClientRect()` вызывается несколько раз
   - Вызывается при resize (может быть часто)

### Утечки событий

**Потенциальные проблемы:**

1. **Header resize listener (index.html:1845):**
   ```javascript
   window.addEventListener('resize', () => {
       centerBrandOnCatalogBtn();
   });
   ```
   - Не удаляется (но это нормально для header)
   - Может вызываться часто на мобильных (ориентация)

2. **Scroll listener (index.html:1811):**
   - Использует `{ passive: true }` ✅ (хорошая практика)
   - Не удаляется (нормально)

3. **CatalogButton (catalogButton.js:71-72):**
   - Добавляет/удаляет listeners при открытии/закрытии ✅
   - Корректное управление

4. **ProductPopup (product-popup.js:741-785):**
   - Добавляет/удаляет listeners при открытии/закрытии ✅
   - Корректное управление

**Вывод:** Утечек не обнаружено, но resize listener на header может быть оптимизирован (throttle/debounce)

### Риски для мобильных

1. **Header resize listener:**
   - Частые вызовы при изменении ориентации
   - `getBoundingClientRect()` - тяжелая операция
   - Рекомендация: throttle/debounce

2. **Рендеринг каталога:**
   - Большое количество товаров → медленный рендеринг
   - На слабых мобильных устройствах - лаги

3. **Video carousel:**
   - Видео элементы тяжелые
   - Множественные видео на странице → медленная загрузка

4. **Mega Menu:**
   - Полноэкранное меню на мобильных (megaMenu.css:237+)
   - Рендеринг большого количества категорий → медленно

---

## MOBILE РИСКИ

### Что сломается при изменении размеров элементов

**Header:**
- `centerBrandOnCatalogBtn()` использует `getBoundingClientRect()`
- Если изменить размеры кнопок через CSS → позиции пересчитаются автоматически при resize
- **Риск:** НИЗКИЙ (есть resize listener)

**Popup:**
- `showAddToCartHint()` использует `offsetWidth` для подсказки
- Изменение размеров кнопки → подсказка может быть неправильно позиционирована
- **Риск:** СРЕДНИЙ

**Video carousel:**
- Позиции карточек вычисляются через индексы
- Изменение размеров карточек → визуальные проблемы, но логика не сломается
- **Риск:** НИЗКИЙ

### Что сломается при скрытии header

**КРИТИЧЕСКОЕ:**
- Если скрыть `#headerRow1` или `#headerSticky` через `display: none`:
  - `getBoundingClientRect()` вернет нулевые размеры
  - `centerBrandOnCatalogBtn()` сломается
  - Позиционирование будет неправильным

**Рекомендация:** Использовать `visibility: hidden` или `opacity: 0` вместо `display: none` для вычислений

### Что сломается при добавлении mobile-header

**КРИТИЧЕСКОЕ:**
- Если добавить новый `.mobile-header` параллельно существующему:
  - JS все еще будет искать `.catalog-btn`, `.cart-btn` в старом header
  - Инициализация может найти элементы в неправильном месте
  - Логика позиционирования сломается

**Рекомендация:** Изолировать mobile-header, использовать отдельные селекторы или data-атрибуты

### Что сломается при изменении сетки каталога

**НИЗКИЙ РИСК:**
- Сетка каталога (`.catalog-grid`) использует CSS Grid
- JS только рендерит HTML в `#catalogGrid`
- Изменение CSS Grid (колонки, gap) не влияет на JS
- **Риск:** НИЗКИЙ (можно менять свободно)

### Что категорически нельзя менять

1. **ID элементов header:**
   - `#headerSticky`, `#headerRow1` - сломается инициализация

2. **Классы header, используемые в JS:**
   - `.header-row-2`, `.catalog-btn`, `.cart-btn`, `.row1-brand`, `.row1-nav`
   - Сломается `centerBrandOnCatalogBtn()`

3. **Порядок элементов в `.header-row-2`:**
   - Вычисления позиций зависят от порядка
   - Кнопки должны быть в определенном порядке

4. **ID контейнеров каталога:**
   - `#catalogGrid`, `#sortSelect`, `#filterColors` и другие
   - Сломается инициализация каталога

5. **Класс `.product-card`:**
   - Используется для обработчиков клика
   - Сломается открытие попапа

6. **Структура Mega Menu:**
   - Классы структуры обязательны для рендеринга
   - Классы состояний (`is-open`, `is-active`) обязательны для логики

7. **ID и классы попапа:**
   - `#productPopup`, `.product-popup-overlay`, `.product-popup__container`
   - Сломается логика закрытия

---

## ЧТО НЕЛЬЗЯ ТРОГАТЬ

### Критические ID

```
#headerSticky
#headerRow1
#catalogGrid
#sortSelect
#filterColors
#filterResetBtn
#cabinet-app (кабинет)
#productPopup (попап, создается динамически)
#videoCarousel
#prevVideo
#nextVideo
#centerVideo
#leftPreviews
#rightPreviews
#cartBadge
```

### Критические классы

**Header:**
```
.header-row-2
.catalog-btn
.cart-btn
.row1-brand
.row2-brand
.row1-nav
.logo-icon
```

**Каталог:**
```
.product-card
.catalog-grid
.color-swatch
.filter-btn
```

**Mega Menu:**
```
.mega-menu
.mega-menu__inner
.mega-menu__categories
.mega-menu__subcategories
.mega-menu__fabric-types
.mega-menu__category-item
.mega-menu__subcategory-item
.mega-menu__fabric-type-item
```

**Popup:**
```
.product-popup
.product-popup-overlay
.product-popup__container
```

**Классы состояний (управляются JS):**
```
.scrolled (header)
.collapsed (header-row-1)
.line-ready (header-row-1)
.positioned (row1-brand)
.ready (header-row-2)
.is-open (mega-menu)
.is-active (кнопки, категории)
.no-scroll (body)
```

### Критические функции

```javascript
// Header (index.html)
initHeader()
centerBrandOnCatalogBtn()
handleScroll()

// Catalog (catalog.html)
initAllFilters()
applyFilters()
loadCatalog()
applyFiltersLocally()

// DataStore (ядро)
CatalogDataStore.load()
CatalogDataStore.getAllProducts()
CatalogDataStore.getNavigation()

// EventBus (ядро)
CatalogEventBus.emit()
CatalogEventBus.on()

// Popup
ProductPopup.open()
ProductPopup.close()
```

### Критические структуры данных

```javascript
// Catalog state
filtersState = { color, fabricType, composition, density, price, status }

// Header вычисления
--brand-center-left (CSS переменная)
--nav-center-left (CSS переменная)
--line-start (CSS переменная)
--line-width (CSS переменная)
```

---

## ЧТО МОЖНО ТРОГАТЬ

### Безопасные изменения через CSS

1. **Визуальные стили header:**
   - Цвета, шрифты, отступы, размеры (кроме структуры)
   - Медиазапросы для адаптивности
   - Анимации и transitions

2. **Сетка каталога (CSS Grid):**
   - Колонки, gap, выравнивание
   - Медиазапросы для адаптивности
   - `grid-template-columns` можно менять свободно

3. **Стили карточек товаров:**
   - Все визуальные стили `.product-card`
   - Layout карточек (flexbox/grid внутри)
   - Медиазапросы

4. **Стили попапа:**
   - Визуальные стили (кроме структуры контейнеров)
   - Размеры, позиционирование (кроме логики закрытия)
   - Медиазапросы

5. **Стили Mega Menu:**
   - Визуальные стили (кроме структуры)
   - Позиционирование, размеры
   - Медиазапросы

6. **Все стили кабинета:**
   - Кабинет изолирован, можно менять CSS свободно

### Безопасные HTML изменения

1. **Текстовое содержимое:**
   - Все тексты можно менять
   - Placeholder'ы, labels

2. **Атрибуты (кроме data-* и ID):**
   - `alt`, `title`, `aria-*` (кроме критических)
   - `href` (кроме структурных)

3. **Добавление оберток:**
   - Можно добавлять обертки вокруг элементов (если не ломается селектор)
   - Нужно проверять `querySelector` путь

### Что требует осторожности

1. **Добавление mobile-header:**
   - Требует изоляции (отдельные селекторы)
   - Или условная инициализация JS

2. **Изменение структуры фильтров:**
   - Можно менять layout, но сохранять ID контейнеров
   - Можно добавлять обертки, если селекторы работают

3. **Скрытие header на мобильных:**
   - Использовать `visibility: hidden` вместо `display: none`
   - Или полностью изолировать mobile-header

---

## РЕКОМЕНДОВАННАЯ СТРАТЕГИЯ

### Фаза 1: Подготовка (безопасно)

1. **Вынести константы селекторов:**
   - Создать `config.js` с константами SELECTORS
   - Использовать data-атрибуты вместо классов для логики
   - Цель: уменьшить связанность

2. **Оптимизация resize listener:**
   - Добавить throttle/debounce для `centerBrandOnCatalogBtn()`
   - Уменьшить частоту вызовов на мобильных

3. **Документирование зависимостей:**
   - Создать карту зависимостей (этот документ)
   - Пометить критические элементы комментариями в коде

### Фаза 2: Изоляция mobile-header (критично)

**Проблема:** Существующий header нельзя менять без риска.

**Решение:**

1. **Создать отдельный mobile-header:**
   ```html
   <header class="site-header site-header--mobile" data-mobile-header>
     <!-- Новая структура для мобильных -->
   </header>
   ```

2. **Условная инициализация JS:**
   ```javascript
   if (window.innerWidth <= 768) {
       initMobileHeader();
   } else {
       initDesktopHeader(); // существующая логика
   }
   ```

3. **CSS медиазапросы:**
   ```css
   @media (max-width: 768px) {
       .site-header:not([data-mobile-header]) {
           display: none; /* скрыть desktop header */
       }
   }
   ```

4. **Изолировать логику:**
   - Новая функция `initMobileHeader()` для мобильных
   - Старая `initHeader()` для desktop
   - Разные селекторы для mobile/desktop

**Альтернатива (проще):**
- Использовать один header, но адаптировать через CSS
- Осторожно менять структуру, тестируя `centerBrandOnCatalogBtn()`
- Добавить fallback для мобильных (упрощенная логика позиционирования)

### Фаза 3: Адаптация компонентов (по приоритету)

**Приоритет 1: Header**
- Самый критичный компонент
- Требует изоляции mobile-версии
- Или рефакторинг `centerBrandOnCatalogBtn()` для поддержки разных layout'ов

**Приоритет 2: Каталог**
- Относительно безопасен (только ID контейнеров)
- Можно менять CSS Grid свободно
- Фильтры требуют сохранения ID

**Приоритет 3: Popup**
- Можно менять визуальные стили
- Структура контейнеров критична
- Можно адаптировать через CSS медиазапросы

**Приоритет 4: Mega Menu**
- Структура критична
- Можно менять визуальные стили
- На мобильных уже есть адаптация (fullscreen)

**Приоритет 5: Кабинет**
- Полностью изолирован
- Можно менять свободно

### Фаза 4: Оптимизация производительности

1. **Throttle/debounce для resize:**
   - Header resize listener
   - Уменьшить частоту вызовов

2. **Ленивая загрузка:**
   - Видео карусель (lazy loading)
   - Изображения каталога (уже есть `loading="lazy"`)

3. **Виртуализация каталога:**
   - Для больших списков товаров
   - Рендерить только видимые элементы

### Рекомендации по тестированию

1. **Перед каждым изменением:**
   - Тестировать `centerBrandOnCatalogBtn()` на разных размерах
   - Проверять работу фильтров
   - Проверять открытие/закрытие попапа
   - Проверять mega menu

2. **Чек-лист критических функций:**
   - [ ] Header инициализируется
   - [ ] Sticky header работает
   - [ ] Позиционирование "Bazar Buy" корректно
   - [ ] Каталог рендерится
   - [ ] Фильтры работают
   - [ ] Попап открывается/закрывается
   - [ ] Mega menu открывается/закрывается
   - [ ] Поиск работает

3. **Тестирование на устройствах:**
   - iPhone (Safari)
   - Android (Chrome)
   - Разные размеры экранов
   - Разные ориентации

### Итоговые рекомендации

**МОЖНО делать безопасно:**
- Изменять визуальные стили через CSS
- Добавлять медиазапросы
- Менять сетку каталога (CSS Grid)
- Адаптировать стили попапа, mega menu

**ТРЕБУЕТ ОСТОРОЖНОСТИ:**
- Добавление mobile-header (требует изоляции)
- Изменение структуры header (требует тестирования `centerBrandOnCatalogBtn()`)
- Скрытие элементов header (использовать `visibility`, не `display: none`)

**НЕЛЬЗЯ:**
- Менять ID критических элементов
- Менять классы, используемые в JS
- Менять порядок элементов в header
- Менять структуру попапа (контейнеры)
- Менять структуру mega menu (классы)

**КРИТИЧЕСКИЙ ПУТЬ:**
1. Сначала изолировать mobile-header (Фаза 2)
2. Затем адаптировать остальные компоненты (Фаза 3)
3. Оптимизировать производительность (Фаза 4)

---

**Конец технического аудита**


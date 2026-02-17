/**
 * PRODUCT-POPUP.JS
 * Модуль карточки товара (pop-up)
 * 
 * Отвечает за:
 * - Загрузку данных одного товара
 * - Отображение popup-карточки
 * - Выбор цвета, количества
 * - Добавление в корзину (заявку)
 * 
 * НЕ отвечает за:
 * - Каталог
 * - Хранение корзины
 * - Бизнес-логику заказов
 * 
 * ДИЗАЙН: Сохранён оригинальный дизайн карточки
 */

const ProductPopup = (function() {
  'use strict';

  // ============================================
  // КОНФИГУРАЦИЯ
  // ============================================

  const CONFIG = {
    dataPath: '/data/products/',
    defaultImage: '/images/placeholder.jpg',
    
    // Дефолтные значения для отсутствующих данных
    defaults: {
      minMeters: 1,
      metersPerRoll: 100
    },

    // Валюты для конвертации (UI-логика, не данные товара)
    currencies: [
      { code: 'RUB', symbol: '₽', name: 'Российский рубль', rate: 1 },
      { code: 'USD', symbol: '$', name: 'Доллар США', rate: 95.50 },
      { code: 'KZT', symbol: '₸', name: 'Тенге', rate: 0.21 },
      { code: 'KGS', symbol: 'с', name: 'Сом', rate: 1.10 }
    ]
  };

  // ============================================
  // СОСТОЯНИЕ
  // ============================================

  let state = {
    product: null,
    selectedColor: null,
    selectedColorIndex: -1,
    meters: 1,
    rolls: 1,
    currency: CONFIG.currencies[0],
    currentImageIndex: 0,
    isOpen: false,
    currencyMenuOpen: false,
    colorsExpanded: false
  };

  let popupElement = null;
  let isClickHandlerAttached = false;
  let areEventsBound = false; // Phase 5C-1: Guard for document/popup listeners

  // ============================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================

  /**
   * Загрузить товар по ID
   */
  async function loadProduct(productId) {
    try {
      // Используем CatalogDataStore как единый источник данных
      // Если данные ещё не загружены, загружаем их
      if (CatalogDataStore.getAllProducts().length === 0) {
        // Пытаемся загрузить данные из того же источника, что и каталог
        await CatalogDataStore.load('data/products.json');
      }
      
      // Получаем товар через DataStore
      const products = CatalogDataStore.getAllProducts();
      const product = products.find(p => {
        const id = p.id || p.productId;
        return id === parseInt(productId) || id === String(productId) || id === productId;
      });
      
      if (!product) {
        console.error(`ProductPopup: товар не найден: ${productId}`);
        return null;
      }
      
      return product;
    } catch (error) {
      console.error('ProductPopup: ошибка загрузки', error);
      return null;
    }
  }

  // ============================================
  // БЕЗОПАСНЫЙ ДОСТУП К ДАННЫМ
  // ============================================

  /**
   * Безопасно получить значение из объекта
   */
  function safeGet(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result !== undefined && result !== null ? result : defaultValue;
  }

  /**
   * Проверить наличие данных
   */
  function hasData(value) {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  }

  // ============================================
  // РАСЧЁТЫ
  // ============================================

  /**
   * Конвертация цены в выбранную валюту
   */
  function convertPrice(price) {
    return Math.round(price / state.currency.rate);
  }

  /**
   * Получить meters_per_roll с фоллбэком
   */
  function getMetersPerRoll() {
    return safeGet(state.product, 'order.meters_per_roll', CONFIG.defaults.metersPerRoll);
  }

  /**
   * Получить min_meters с фоллбэком
   */
  function getMinMeters() {
    return safeGet(state.product, 'order.min_meters', CONFIG.defaults.minMeters);
  }

  /**
   * Синхронизация метров и рулонов
   */
  function syncMetersToRolls(meters) {
    const metersPerRoll = getMetersPerRoll();
    return Math.max(1, Math.round(meters / metersPerRoll));
  }

  function syncRollsToMeters(rolls) {
    const metersPerRoll = getMetersPerRoll();
    return rolls * metersPerRoll;
  }

  // ============================================
  // РЕНДЕРИНГ
  // ============================================

  /**
   * Ос��овная функция рендеринга popup
   */
  function render() {
    if (!state.product) return '';

    const p = state.product;
    
    // Возвращаем только внутренний контейне��, без внешнего overlay
    // (overlay уже есть в HTML как #productPopup)
    return `
      <div class="product-popup__container" data-action="stopPropagation">
        <!-- Уведомление о добавлении -->
        <div class="product-popup__notification" style="display: none;">
          Товар добавлен в корзину
        </div>

        <div class="product-popup__content">
          <!-- Левая колонка - Изображения -->
          <div class="product-popup__images">
            ${renderMainImage()}
            ${renderGallery()}
            <button class="product-popup__view-all">СМОТРЕТЬ ВСЕ ТКАНИ</button>
          </div>

          <!-- Правая колонка - Информация -->
          <div class="product-popup__info">
            ${renderHeader()}
            ${renderArticle()}
            ${renderPrice()}
            ${renderColors()}
            ${renderQuantity()}
            ${renderAddToCart()}
            ${renderSpecs()}
            ${renderDescription()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Рендер основного изображения
   */
  function renderMainImage() {
    const images = getAllImages();
    const currentImage = images[state.currentImageIndex] || CONFIG.defaultImage;
    
    return `
      <div class="product-popup__main-image">
        <img src="${escapeHtml(currentImage)}" alt="${escapeHtml(state.product.name)}" />
      </div>
    `;
  }

  /**
   * Рендер галереи миниатюр
   */
  function renderGallery() {
    const images = getAllImages();
    
    // Всегда показываем 4 миниатюры
    // Если изображений меньше 4, дублируем основное изображение
    let displayImages = [...images];
    while (displayImages.length < 4) {
      displayImages.push(images[0] || state.product.image);
    }
    displayImages = displayImages.slice(0, 4);

    const thumbnails = displayImages.map((img, idx) => {
      // Определяем реальный индекс в исходном массиве images
      const realIndex = idx < images.length ? idx : 0;
      return `
      <div 
        class="product-popup__thumbnail ${realIndex === state.currentImageIndex ? 'product-popup__thumbnail--active' : ''}"
        data-action="selectImage"
        data-index="${realIndex}"
      >
        <img src="${escapeHtml(img)}" alt="" />
      </div>
    `;
    }).join('');

    return `<div class="product-popup__thumbnails">${thumbnails}</div>`;
  }

  /**
   * Получить все изображения (основное + галерея)
   */
  function getAllImages() {
    // Если выбран цвет и у него есть изображения, используем их
    if (state.selectedColor && state.selectedColor.images && state.selectedColor.images.length > 0) {
      return state.selectedColor.images;
    }
    
    // Иначе используем стандартные изображения товара
    const images = [state.product.image];
    const gallery = safeGet(state.product, 'gallery', []);
    return [...images, ...gallery];
  }

  /**
   * Получить изображение для цвета
   */
  function getColorImage(color, colorIndex) {
    // Если color - объект с изображениями
    if (typeof color === 'object' && color.images && color.images.length > 0) {
      return color.images[0];
    }
    
    // Если color - объект с одним изображением
    if (typeof color === 'object' && color.image) {
      return color.image;
    }
    
    // Если color - строка или объект без изображения, используем основное изображение товара
    // В реальном приложении здесь должна быть логика получения изображения по цвету
    // Для демо используем основное изображение товара
    return state.product.image || CONFIG.defaultImage;
  }

  /**
   * Рендер заголовка (название)
   */
  function renderHeader() {
    return `
      <h1 class="product-popup__name">${escapeHtml(state.product.name)}</h1>
    `;
  }

  /**
   * Рендер артикула
   */
  function renderArticle() {
    const article = safeGet(state.product, 'article') || safeGet(state.product, 'sku') || `FAB-${String(state.product.id).padStart(3, '0')}`;
    return `
      <p class="product-popup__article">Артикул: ${escapeHtml(article)}</p>
    `;
  }

  /**
   * Рендер блока цены
   */
  function renderPrice() {
    const displayPrice = convertPrice(state.product.price);

    // Получаем название валюты для отображения
    const currencyName = state.currency.code === 'RUB' ? 'руб.' : 
                        state.currency.code === 'USD' ? '$' :
                        state.currency.code === 'KZT' ? '₸' :
                        state.currency.code === 'KGS' ? 'с' : state.currency.symbol;

    const currencyItems = CONFIG.currencies.map(c => {
      const isSelected = c.code === state.currency.code;
      return `
        <div 
          class="product-popup__currency-item ${isSelected ? 'product-popup__currency-item--selected' : ''}"
          data-action="selectCurrency"
          data-currency-code="${c.code}"
        >
          <span class="product-popup__currency-symbol">${escapeHtml(c.symbol)}</span>
          <span class="product-popup__currency-name">${escapeHtml(c.name)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="product-popup__price-section">
        <div class="product-popup__price-block">
          <div class="product-popup__price">
            ${formatPrice(displayPrice)}
            <span class="product-popup__price-currency">${currencyName}</span>
          </div>
          <p class="product-popup__price-note">Цена указана за погонный метр</p>
        </div>
        <div class="product-popup__currency-wrapper">
          <button 
            class="product-popup__currency-btn ${state.currencyMenuOpen ? 'product-popup__currency-btn--open' : ''}"
            data-action="toggleCurrencyMenu"
          >
            ${escapeHtml(state.currency.symbol)}
          </button>
          <div class="product-popup__currency-dropdown ${state.currencyMenuOpen ? 'product-popup__currency-dropdown--open' : ''}">
            ${currencyItems}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Рендер выбора цвета
   * СКРЫВАЕТСЯ если нет цветов
   */
  function renderColors() {
    const colors = safeGet(state.product, 'colors', []);
    
    if (!hasData(colors)) return '';

    // Количество цветов в первой строке (8 колонок в сетке)
    const colorsPerRow = 8;
    const visibleColorsCount = state.colorsExpanded ? colors.length : colorsPerRow;
    const hasMoreColors = colors.length > colorsPerRow;
    const hiddenColorsCount = colors.length - colorsPerRow;

    const visibleColors = colors.slice(0, visibleColorsCount);
    const colorTiles = visibleColors.map((color, localIdx) => {
      // Используем реальный индекс из исходного массива colors
      const realIndex = localIdx;
      const isSelected = realIndex === state.selectedColorIndex;
      const colorName = typeof color === 'string' ? color : (color.name || '');
      const isAvailable = typeof color === 'object' ? (color.available !== false) : true;
      const colorImage = getColorImage(color, realIndex);
      
      return `
        <div 
          class="product-popup__color-tile ${isSelected ? 'product-popup__color-tile--selected' : ''} ${!isAvailable ? 'product-popup__color-tile--disabled' : ''}"
          data-action="selectColor"
          data-index="${realIndex}"
          title="${escapeHtml(colorName)}"
        >
          <img src="${escapeHtml(colorImage)}" alt="${escapeHtml(colorName)}" onerror="this.src='${CONFIG.defaultImage}'" />
        </div>
      `;
    }).join('');

    // Кнопка "+N цветов"
    const moreColorsButton = hasMoreColors && !state.colorsExpanded ? `
      <div 
        class="product-popup__color-more"
        data-action="expandColors"
      >
        +${hiddenColorsCount} ${pluralize(hiddenColorsCount, 'цвет', 'цвета', 'цветов')}
      </div>
    ` : '';

    // Кнопка "Свернуть" если цвета раскрыты
    const collapseButton = state.colorsExpanded && hasMoreColors ? `
      <div 
        class="product-popup__color-collapse"
        data-action="collapseColors"
      >
        Свернуть
      </div>
    ` : '';

    return `
      <div class="product-popup__colors-section">
        <p class="product-popup__label">Цвет</p>
        <div class="product-popup__colors">
          ${colorTiles}
          ${moreColorsButton}
          ${collapseButton}
        </div>
      </div>
    `;
  }

  /**
   * Рендер выбора количества (метры + рулоны)
   */
  function renderQuantity() {
    const minMeters = getMinMeters();
    const metersPerRoll = getMetersPerRoll();

    return `
      <div class="product-popup__quantity-section">
        <!-- Заголовки -->
        <div class="product-popup__quantity-labels">
          <p class="product-popup__label">количество м.</p>
          <p class="product-popup__label">количество рулонов</p>
        </div>
        
        <!-- Элементы управления -->
        <div class="product-popup__quantity-controls-row">
          <div class="product-popup__quantity-controls">
            <button class="product-popup__qty-btn" data-action="decreaseMeters">−</button>
            <input 
              type="number" 
              class="product-popup__qty-input" 
              value="${state.meters}"
              data-action="inputMeters"
              min="1"
            />
            <button class="product-popup__qty-btn" data-action="increaseMeters">+</button>
          </div>
          <div class="product-popup__quantity-controls">
            <button class="product-popup__qty-btn" data-action="decreaseRolls">−</button>
            <input 
              type="number" 
              class="product-popup__qty-input" 
              value="${state.rolls}"
              data-action="inputRolls"
              min="1"
            />
            <button class="product-popup__qty-btn" data-action="increaseRolls">+</button>
          </div>
        </div>
        
        <!-- Подсказки -->
        <div class="product-popup__quantity-hints">
          <p class="product-popup__quantity-hint">мин. отрез ${minMeters} м.</p>
          <p class="product-popup__quantity-hint">В одном рулоне ${metersPerRoll} м.</p>
        </div>
      </div>
    `;
  }

  /**
   * Получить товар из корзины по productId и color
   * ВСЕГДА безопасная, НИКОГДА не выбрасывает ошибки
   */
  function getCartItem() {
    try {
      if (!state.product) {
        return null;
      }
      
      if (typeof CartStore === 'undefined' || typeof CartStore.getAll !== 'function') {
        console.log('ProductPopup: CartStore недоступен');
        return null;
      }
      
      const cartItems = CartStore.getAll();
      if (!Array.isArray(cartItems)) {
        console.log('ProductPopup: cartItems не массив', cartItems);
        return null;
      }
      
      const currentProductId = String(state.product.id);
      const currentColor = state.selectedColor?.name || null;
      
      // Убраны логи для уменьшения шума в консоли
      const found = cartItems.find(item => 
        item && 
        item.productId === currentProductId && 
        item.color === currentColor
      );
      
      return found || null;
    } catch (error) {
      console.warn('ProductPopup: ошибка getCartItem', error);
      return null;
    }
  }

  /**
   * Рендер строки состояния корзины
   */
  function renderCartState() {
    const cartItem = getCartItem();
    
    if (!cartItem) {
      return '';
    }
    
    console.log('ProductPopup: отображаем состояние корзины', {
      cartItemMeters: cartItem.meters,
      cartItemRolls: cartItem.rolls,
      cartItemColor: cartItem.color,
      stateMeters: state.meters,
      stateRolls: state.rolls
    });
    
    const parts = [`${cartItem.meters} м`];
    
    if (cartItem.rolls > 0) {
      parts.push(`${cartItem.rolls} рул.`);
    }
    
    if (cartItem.color) {
      parts.push(`цвет: ${cartItem.color}`);
    }
    
    const stateHTML = `
      <div class="product-popup__cart-state">
        Уже в корзине: ${parts.join(', ')}
      </div>
    `;
    
    return stateHTML.trim();
  }

  /**
   * Проверить, все ли выбрано для добавления в корзину
   */
  function isReadyToAdd() {
    // Валюта всегда выбрана (по умолчанию)
    // Проверяем цвет, если есть цвета
    const hasColors = hasData(safeGet(state.product, 'colors', []));
    if (hasColors && state.selectedColorIndex === -1) {
      return false;
    }
    // Количество всегда есть (минимум)
    return true;
  }

  /**
   * Рендер попап-подсказки
   */
  function renderAddToCartHint() {
    if (isReadyToAdd()) {
      return '';
    }
    
    return `
      <div class="product-popup__add-hint" data-action="stopPropagation">
        <div class="product-popup__add-hint-content">
          Чтобы добавить товар в корзину, выберите валюту, цвет и укажите количество метров или рулонов.
        </div>
      </div>
    `;
  }

  /**
   * Рендер кнопки "Добавить в корзину"
   */
  function renderAddToCart() {
    const cartItem = getCartItem();
    const buttonText = cartItem ? 'ДОБАВИТЬ ЕЩЁ' : 'ДОБАВИТЬ В КОРЗИНУ';

    // Кнопка всегда активна - валидация происходит при клике
    return `
      ${renderCartState()}
      <div class="product-popup__add-section" style="position: relative;">
        ${renderAddToCartHint()}
        <button 
          class="product-popup__add-to-cart"
          data-action="addToCart"
        >
          ${buttonText}
        </button>
      </div>
    `;
  }

  /**
   * Рендер описания
   * Всегда показывается, даже если нет описания
   */
  function renderDescription() {
    const description = safeGet(state.product, 'description', '') || 
                       safeGet(state.product, 'about', '') ||
                       '';
    
    // Если нет описания, используем категорию как базовое описание
    const displayDescription = description || 
                               `${state.product.category || 'Ткань'} высокого качества с отличными характеристиками.`;

    return `
      <div class="product-popup__description">
        <h3 class="product-popup__section-title">Описание</h3>
        <p class="product-popup__description-text">${escapeHtml(displayDescription)}</p>
      </div>
    `;
  }

  /**
   * Рендер характеристик
   * Всегда показывается, даже если данных нет
   */
  function renderSpecs() {
    const specs = safeGet(state.product, 'specs', {});
    const product = state.product;
    
    // Формируем характеристики из разных источников
    const specRows = [];
    
    // Состав (из category если нет специфичных данных)
    if (specs.composition || product.composition) {
      specRows.push({ label: 'В составе', value: specs.composition || product.composition });
    }
    if (specs.content || product.content) {
      specRows.push({ label: 'Состав', value: specs.content || product.content });
    }
    
    // Плотность
    if (specs.density || product.density) {
      specRows.push({ label: 'Плотность', value: specs.density || product.density });
    }
    if (specs.density_linear || product.density_linear) {
      specRows.push({ label: 'Плотность', value: specs.density_linear || product.density_linear });
    }
    
    // Ширина
    if (specs.width || product.width) {
      specRows.push({ label: 'Ширина', value: specs.width || product.width });
    }
    
    // Цвет (используем первый цвет из массива если нет специфичного поля)
    if (specs.color || product.color) {
      specRows.push({ label: 'Цвет', value: specs.color || product.color });
    } else if (product.colors && product.colors.length > 0) {
      specRows.push({ label: 'Цвет', value: product.colors[0] });
    }
    
    // Узор
    if (specs.pattern || product.pattern) {
      specRows.push({ label: 'Узор', value: specs.pattern || product.pattern });
    }
    
    // Страна
    if (specs.country || product.country) {
      specRows.push({ label: 'Страна производитель', value: specs.country || product.country });
    }
    
    // Метров в кг
    if (specs.meters_per_kg || product.meters_per_kg) {
      specRows.push({ label: 'Метров в кг, не менее', value: specs.meters_per_kg || product.meters_per_kg });
    }
    
    // Нарезка
    const minMeters = safeGet(product, 'order.min_meters', CONFIG.defaults.minMeters);
    specRows.push({ label: 'Нарезка', value: `от ${minMeters} метров` });
    
    // Метров в рулоне
    const metersPerRoll = safeGet(product, 'order.meters_per_roll', CONFIG.defaults.metersPerRoll);
    specRows.push({ label: 'Кол-во метров в рулоне', value: `~${metersPerRoll}` });

    const rows = specRows.map(spec => `
      <div class="product-popup__spec-row">
        <span class="product-popup__spec-label">${escapeHtml(spec.label)}:</span>
        <span class="product-popup__spec-value">${escapeHtml(spec.value)}</span>
      </div>
    `).join('');

    return `
      <div class="product-popup__specs">
        <h3 class="product-popup__section-title">Характеристики</h3>
        <div class="product-popup__specs-list">${rows}</div>
      </div>
    `;
  }

  // ============================================
  // ОБРАБОТКА СОБЫТИЙ
  // ============================================

  /**
   * Обработчик клика вне меню валют
   */
  function handleDocumentClick(event) {
    if (!state.currencyMenuOpen) return;
    
    const target = event.target;
    
    // Проверяем, что клик был не внутри меню валют и не на кнопке валюты
    const clickedInsideCurrencyMenu = target.closest('.product-popup__currency-wrapper') ||
                                     target.closest('.product-popup__currency-dropdown') ||
                                     target.closest('.product-popup__currency-btn');
    
    if (!clickedInsideCurrencyMenu) {
      state.currencyMenuOpen = false;
      updateCurrencyUI();
    }
  }

  /**
   * Навесить стабильный делегированный обработчик клика на корневой контейнер
   */
  function attachClickHandler() {
    if (!popupElement || isClickHandlerAttached) return;
    
    // Навешиваем ОДИН РАЗ на стабильный корневой контейнер
    popupElement.addEventListener('click', handleClick);
    isClickHandlerAttached = true;
    console.log('ProductPopup: обработчик клика навешан на popupElement');
  }

  /**
   * Инициализация обработчиков
   */
  function bindEvents() {
    if (!popupElement) return;
    // Phase 5C-1: Prevent duplicate listener registration
    if (areEventsBound) return;

    // Обработчик клика навешивается ОДИН РАЗ через attachClickHandler()
    // Здесь только остальные обработчики
    popupElement.addEventListener('change', handleChange);
    popupElement.addEventListener('input', handleInput);
    
    // Закрытие по Escape
    document.addEventListener('keydown', handleKeydown);
    
    // Закрытие меню валют при клике вне его (на документе)
    // Используем фазу захвата для более раннего перехвата события
    document.addEventListener('click', handleDocumentClick, true);
    
    areEventsBound = true; // Phase 5C-1: mark listeners as bound
  }


  /**
   * Удаление обработчиков
   */
  function unbindEvents() {
    if (popupElement) {
      if (isClickHandlerAttached) {
        popupElement.removeEventListener('click', handleClick);
        isClickHandlerAttached = false;
      }
      popupElement.removeEventListener('change', handleChange);
      popupElement.removeEventListener('input', handleInput);
    }
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('click', handleDocumentClick, true);
    areEventsBound = false; // Phase 5C-1: reset for next open
  }

  /**
   * Обработка кликов
   */
  function handleClick(event) {
    const target = event.target;
    
    // ПРИОРИТЕТНАЯ обработка кнопки "Добавить в корзину" через делегирование
    // Проверяем СРАЗУ, до всех остальных проверок
    const addToCartButton = target.closest('[data-action="addToCart"]');
    if (addToCartButton) {
      console.log('ProductPopup: найдена кнопка addToCart', { 
        disabled: addToCartButton.disabled,
        hasAttribute: addToCartButton.hasAttribute('disabled'),
        classList: addToCartButton.classList.toString()
      });
      
      event.preventDefault();
      event.stopPropagation();
      
      // Вызываем addToCart() - она сама проверит, можно ли добавить
      console.log('ProductPopup: клик по кнопке "Добавить в корзину"');
      addToCart();
      return;
    }
    
    // Закрытие при клике на overlay (фон), но не внутри попапа
    const clickedOnOverlay = target.classList.contains('product-popup-overlay') ||
                              target.id === 'productPopup';
    
    const clickedInsidePopup = target.closest('.product-popup__container') || 
                               target.closest('.product-popup');
    
    if (clickedOnOverlay && !clickedInsidePopup) {
      close();
      return;
    }
    
    // Останавливаем всплытие для кликов внутри контейнера
    if (target.closest('[data-action="stopPropagation"]')) {
      event.stopPropagation();
    }
    
    // Скрываем подсказку при клике вне её области
    hideAddToCartHint();
    
    const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;
    
    if (!action) return;

    const element = target.closest('[data-action]');

    switch (action) {
      case 'close':
        close();
        break;
      
      case 'toggleCurrencyMenu':
        event.stopPropagation();
        event.preventDefault();
        state.currencyMenuOpen = !state.currencyMenuOpen;
        updateCurrencyUI();
        break;
      
      case 'selectCurrency':
        event.stopPropagation();
        const currencyCode = element.dataset.currencyCode;
        const currency = CONFIG.currencies.find(c => c.code === currencyCode);
        if (currency) {
          state.currency = currency;
          state.currencyMenuOpen = false;
          updateCurrencyUI();
          updatePrice();
        }
        break;
      
      case 'selectColor':
        const colorIndex = parseInt(element.dataset.index);
        selectColor(colorIndex);
        break;
      
      case 'expandColors':
        expandColors();
        break;
      
      case 'collapseColors':
        collapseColors();
        break;
      
      case 'selectImage':
        const imageIndex = parseInt(element.dataset.index);
        selectImage(imageIndex);
        break;
      
      case 'increaseMeters':
        const minMeters = getMinMeters();
        updateMeters(state.meters + minMeters);
        break;
      
      case 'decreaseMeters':
        const minMetersDec = getMinMeters();
        const newValue = state.meters - minMetersDec;
        if (newValue >= minMetersDec) {
          updateMeters(newValue);
        } else {
          updateMeters(minMetersDec);
        }
        break;
      
      case 'increaseRolls':
        updateRolls(state.rolls + 1);
        break;
      
      case 'decreaseRolls':
        updateRolls(state.rolls - 1);
        break;
    }
  }

  /**
   * Обработка изменений (select)
   */
  function handleChange(event) {
    // Метод оставлен для совместимости, если будут другие select элементы
  }

  /**
   * Обработка ввода
   */
  function handleInput(event) {
    const target = event.target;
    const action = target.dataset.action;
    const value = parseInt(target.value) || 0;

    if (action === 'inputMeters') {
      // При ручном вводе также округляем до кратного minMeters
      const minMeters = getMinMeters();
      const roundedValue = Math.max(minMeters, Math.round(value / minMeters) * minMeters);
      
      // Проверяем, заполнено ли поле рулонов
      const rollsInput = popupElement?.querySelector('[data-action="inputRolls"]');
      const rollsValue = rollsInput ? parseInt(rollsInput.value) || 0 : 0;
      
      if (rollsValue > 0) {
        // Если поле рулонов заполнено, обновляем только метры БЕЗ синхронизации рулонов
        state.meters = roundedValue;
        updateQuantityUI();
      } else {
        // Если поле рулонов пустое, синхронизируем рулоны
        updateMeters(roundedValue);
      }
    } else if (action === 'inputRolls') {
      // Проверяем, заполнено ли поле метров
      const metersInput = popupElement?.querySelector('[data-action="inputMeters"]');
      const metersValue = metersInput ? parseInt(metersInput.value) || 0 : 0;
      
      if (metersValue > 0) {
        // Если поле метров заполнено, обновляем только рулоны БЕЗ синхронизации метров
        state.rolls = Math.max(1, value);
        updateQuantityUI();
      } else {
        // Если поле метров пустое, синхронизируем метры
        updateRolls(value);
      }
    }
  }

  /**
   * Обработка клавиш
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      if (state.currencyMenuOpen) {
        // Закрываем меню валюты
        state.currencyMenuOpen = false;
        updateCurrencyUI();
      } else if (state.isOpen) {
        // Закрываем весь попап
        close();
      }
    }
  }

  // ============================================
  // ДЕЙСТВИЯ
  // ============================================

  /**
   * Выбор цвета
   */
  function selectColor(index) {
    const color = state.product.colors?.[index];
    
    // Проверяем доступность цвета
    if (typeof color === 'object' && color.available === false) {
      return; // Не выбираем недоступные цвета
    }
    
    state.selectedColorIndex = index;
    
    // Если color - строка, создаём объект с name
    // Если color - объект, используем как есть
    state.selectedColor = typeof color === 'string' 
      ? { name: color }
      : (color || null);
    
    // Обновляем изображения при выборе цвета
    updateColorImages();
    
    // Обновляем только секцию цветов без полной перерисовки
    updateColorsUI();
    
    // Обновляем состояние корзины после смены цвета (асинхронно, не блокирует)
    updateCartStateUI();
    
    // Скрываем подсказку после выбора цвета (если все выбрано)
    updateAddToCartHint();
  }

  /**
   * Обновить изображения при выборе цвета
   */
  function updateColorImages() {
    // Сбрасываем индекс изображения при смене цвета
    state.currentImageIndex = 0;
    
    // Обновляем главное фото и миниатюры
    updateImageUI();
  }

  /**
   * Обновить только UI цветов (без полной перерисовки)
   */
  function updateColorsUI() {
    if (!popupElement) return;
    
    const colorsSection = popupElement.querySelector('.product-popup__colors-section');
    if (colorsSection) {
      const colorsHTML = renderColors();
      colorsSection.outerHTML = colorsHTML;
      bindEvents();
    }
  }

  /**
   * Раскрыть все цвета
   */
  function expandColors() {
    state.colorsExpanded = true;
    updateColorsUI();
  }

  /**
   * Свернуть цвета
   */
  function collapseColors() {
    state.colorsExpanded = false;
    updateColorsUI();
  }

  /**
   * Обновить только изображение (без полной перерисовки)
   */
  function updateImageUI() {
    if (!popupElement || !state.product) return;
    
    const images = getAllImages();
    
    // Проверяем валидность индекса
    if (state.currentImageIndex < 0 || state.currentImageIndex >= images.length) {
      console.warn('ProductPopup: недопустимый индекс изображения', state.currentImageIndex);
      state.currentImageIndex = 0;
    }
    
    const currentImage = images[state.currentImageIndex];
    
    if (!currentImage) {
      console.warn('ProductPopup: изображение не найдено для индекса', state.currentImageIndex);
      return;
    }
    
    // Обновляем основное изображение
    const mainImage = popupElement.querySelector('.product-popup__main-image img');
    if (mainImage) {
      // Используем путь к изображению как есть (он уже должен быть полным)
      mainImage.src = currentImage;
      mainImage.alt = escapeHtml(state.product.name);
      
      // Обработчик ошибок загрузки изображения
      mainImage.onerror = function() {
        console.error('ProductPopup: ошибка загрузки изображения', currentImage);
        this.src = CONFIG.defaultImage;
        this.onerror = null; // Предотвращаем бесконечный цикл
      };
    }
    
    // Обновляем активное состояние миниатюр
    const thumbnails = popupElement.querySelectorAll('.product-popup__thumbnail');
    thumbnails.forEach((thumb) => {
      const thumbIndex = parseInt(thumb.dataset.index);
      if (thumbIndex === state.currentImageIndex) {
        thumb.classList.add('product-popup__thumbnail--active');
      } else {
        thumb.classList.remove('product-popup__thumbnail--active');
      }
    });
  }

  /**
   * Выбор изображения
   */
  function selectImage(index) {
    state.currentImageIndex = index;
    updateImageUI();
  }

  /**
   * Обновить только поля количества (без полной перерисовки)
   */
  function updateQuantityUI() {
    if (!popupElement || !state.product) return;
    
    const metersInput = popupElement.querySelector('[data-action="inputMeters"]');
    const rollsInput = popupElement.querySelector('[data-action="inputRolls"]');
    
    if (metersInput) {
      metersInput.value = state.meters;
    }
    
    if (rollsInput) {
      rollsInput.value = state.rolls;
    }
  }

  /**
   * Обновление метров
   */
  function updateMeters(value) {
    const minMeters = getMinMeters();
    // Округляем значение до ближайшего кратного minMeters
    const roundedValue = Math.max(minMeters, Math.round(value / minMeters) * minMeters);
    state.meters = roundedValue;
    state.rolls = syncMetersToRolls(state.meters);
    updateQuantityUI();
  }

  /**
   * Обновление рулонов
   */
  function updateRolls(value) {
    state.rolls = Math.max(1, value);
    state.meters = syncRollsToMeters(state.rolls);
    updateQuantityUI();
  }

  /**
   * Добавление в корзину (заявку)
   * 
   * КОНТРАКТ КОРЗИНЫ:
   * В корзину кладём ТОЛЬКО идентификаторы и количество.
   * Цены, названия, изображения — НЕ хранятся в корзине.
   * Cabinet/менеджер получают данные по productId.
   */
  function addToCart() {
    console.log('ProductPopup: addToCart() вызвана');
    
    if (!state.product) {
      console.warn('ProductPopup: нет товара для добавления');
      return;
    }
    
    const hasColors = hasData(safeGet(state.product, 'colors', []));
    
    if (hasColors && state.selectedColorIndex === -1) {
      console.warn('ProductPopup: нужно выбрать цвет');
      // Показываем подсказку вместо alert
      showAddToCartHint();
      return;
    }

    // Читаем актуальные значения из полей ввода напрямую
    // ВАЖНО: используем значения из полей, а не из state, так как state может быть
    // изменен автоматической синхронизацией при вводе
    const metersInput = popupElement?.querySelector('[data-action="inputMeters"]');
    const rollsInput = popupElement?.querySelector('[data-action="inputRolls"]');
    
    if (!metersInput || !rollsInput) {
      console.warn('ProductPopup: поля ввода не найдены');
      return;
    }
    
    // Получаем сырые строковые значения из полей ввода
    const metersRaw = metersInput.value.trim();
    const rollsRaw = rollsInput.value.trim();
    
    // Парсим значения, используя Number для более точного парсинга
    const metersFromInput = metersRaw ? Number(metersRaw) : 0;
    const rollsFromInput = rollsRaw ? Number(rollsRaw) : 0;
    
    console.log('ProductPopup: чтение значений из полей', {
      metersRaw: metersRaw,
      rollsRaw: rollsRaw,
      metersFromInput: metersFromInput,
      rollsFromInput: rollsFromInput,
      metersInputValue: metersInput.value,
      rollsInputValue: rollsInput.value
    });
    
    // Проверяем, что пользователь видит в полях
    // Если оба поля имеют значения > 0, значит пользователь явно указал оба значения
    // В этом случае используем их БЕЗ дополнительной синхронизации
    const bothHaveValues = metersFromInput > 0 && rollsFromInput > 0;
    
    let meters, rolls;
    
    if (bothHaveValues) {
      // Если оба поля заполнены - используем оба значения БЕЗ синхронизации
      // (пользователь явно указал оба значения, даже если они были синхронизированы)
      meters = metersFromInput;
      rolls = rollsFromInput;
      console.log('ProductPopup: используем оба значения без синхронизации', { meters, rolls });
    } else if (metersFromInput > 0) {
      // Если указаны только метры, синхронизируем рулоны
      meters = metersFromInput;
      rolls = syncMetersToRolls(meters);
      console.log('ProductPopup: синхронизируем рулоны с метрами', { meters, rolls });
    } else if (rollsFromInput > 0) {
      // Если указаны только рулоны, синхронизируем метры
      rolls = rollsFromInput;
      meters = syncRollsToMeters(rolls);
      console.log('ProductPopup: синхронизируем метры с рулонами', { meters, rolls });
    } else {
      // Если оба поля пустые, используем минимальные значения
      const minMeters = getMinMeters();
      meters = minMeters;
      rolls = syncMetersToRolls(meters);
      console.log('ProductPopup: используем минимальные значения', { meters, rolls });
    }
    
    // Обновляем state для отображения
    state.meters = meters;
    state.rolls = rolls;

    // ТОЛЬКО идентификаторы + количество
    const cartItem = {
      productId: String(state.product.id),
      color: state.selectedColor?.name || null,
      meters: meters,
      rolls: rolls
    };

    console.log('ProductPopup: добавляем в корзину', {
      productId: cartItem.productId,
      color: cartItem.color,
      meters: cartItem.meters,
      rolls: cartItem.rolls,
      metersFromInput: metersInput?.value,
      rollsFromInput: rollsInput?.value,
      metersParsed: meters,
      rollsParsed: rolls,
      stateMeters: state.meters,
      stateRolls: state.rolls,
      metersPerRoll: getMetersPerRoll(),
      minMeters: getMinMeters()
    });

    // Отправляем событие для корзины
    const event = new CustomEvent('product:addToCart', {
      detail: cartItem,
      bubbles: true
    });
    document.dispatchEvent(event);

    // Показываем уведомление
    showNotification();
    
    // Обновляем состояние корзины после добавления
    // Ждем события cart:updated, которое будет отправлено CartStore после сохранения
    // updateCartStateUI будет вызван автоматически через обработчик события cart:updated
    // Но также вызываем сразу с небольшой задержкой для надежности
    setTimeout(() => {
      updateCartStateUI();
    }, 100);
  }

  /**
   * Показать уведомление
   */
  function showNotification() {
    const notification = popupElement?.querySelector('.product-popup__notification');
    if (notification) {
      notification.style.display = 'block';
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * Обновить UI состояния корзины (без полной перерисовки)
   * ВСЕГДА безопасная, НИКОГДА не блокирует выполнение
   */
  /**
   * Показать подсказку добавления в корзину
   */
  function showAddToCartHint() {
    if (!popupElement || !state.product) return;
    
    const addSection = popupElement.querySelector('.product-popup__add-section');
    if (!addSection) return;
    
    const button = addSection.querySelector('.product-popup__add-to-cart');
    if (!button) return;
    
    const hintHTML = renderAddToCartHint();
    
    if (!hintHTML.trim()) {
      // Если все выбрано, скрываем подсказку
      const existingHint = document.querySelector('.product-popup__add-hint');
      if (existingHint) {
        existingHint.style.display = 'none';
      }
      return;
    }
    
    // Удаляем старую подсказку, если есть (для гарантии чистого состояния)
    const oldHint = document.querySelector('.product-popup__add-hint');
    if (oldHint) {
      oldHint.remove();
    }
    
    // Всегда создаем новую подсказку для гарантии правильных стилей
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = hintHTML;
    const existingHint = tempDiv.firstElementChild;
    
    // Устанавливаем базовые стили сразу
    existingHint.style.position = 'fixed';
    existingHint.style.zIndex = '10000';
    existingHint.style.display = 'block';
    
    document.body.appendChild(existingHint);
    
    // Сбрасываем все стили позиционирования перед пересчетом
    existingHint.style.left = '';
    existingHint.style.right = '';
    existingHint.style.top = '';
    existingHint.style.transform = '';
    existingHint.style.position = 'fixed';
    existingHint.style.zIndex = '10000';
    existingHint.style.display = 'block';
    
    // Используем requestAnimationFrame для гарантии обновления DOM
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const buttonRect = button.getBoundingClientRect();
        const hintContent = existingHint.querySelector('.product-popup__add-hint-content');
        
        if (!hintContent) return;
        
        // Принудительно получаем ширину после отображения
        const hintWidth = hintContent.offsetWidth || hintContent.scrollWidth || 250;
        
        // Позиция слева от кнопки: левый край кнопки минус ширина подсказки минус отступ
        const leftPosition = buttonRect.left - hintWidth - 15;
        
        // Убеждаемся, что подсказка не выходит за левый край экрана
        const finalLeft = Math.max(10, leftPosition);
        
        existingHint.style.left = finalLeft + 'px';
        existingHint.style.top = (buttonRect.top + buttonRect.height / 2) + 'px';
        existingHint.style.transform = 'translateY(-50%)';
        existingHint.style.right = 'auto';
      });
    });
  }

  /**
   * Скрыть подсказку добавления в корзину
   */
  function hideAddToCartHint() {
    const hint = document.querySelector('.product-popup__add-hint');
    if (hint) {
      hint.style.display = 'none';
    }
  }

  /**
   * Обновить подсказку добавления в корзину (для автоматического скрытия при выборе)
   */
  function updateAddToCartHint() {
    if (!popupElement || !state.product) return;
    
    // Если все выбрано, скрываем подсказку
    if (isReadyToAdd()) {
      hideAddToCartHint();
    }
  }

  function updateCartStateUI() {
    // Асинхронное выполнение, чтобы не блокировать основной поток
    setTimeout(() => {
      try {
        if (!popupElement || !state.product) return;
        
        const button = popupElement.querySelector('.product-popup__add-to-cart');
        if (!button) return;
        
        const cartItem = getCartItem();
        const buttonText = cartItem ? 'ДОБАВИТЬ ЕЩЁ' : 'ДОБАВИТЬ В КОРЗИНУ';
        button.textContent = buttonText;
        
        // Обновляем строку состояния
        const existingState = popupElement.querySelector('.product-popup__cart-state');
        const stateHTML = renderCartState();
        
        if (stateHTML.trim() && !existingState) {
          // Вставляем строку состояния перед кнопкой
          button.insertAdjacentHTML('beforebegin', stateHTML);
        } else if (stateHTML.trim() && existingState) {
          // Обновляем существующую строку
          existingState.outerHTML = stateHTML;
        } else if (!stateHTML.trim() && existingState) {
          // Удаляем строку, если товара нет в корзине
          existingState.remove();
        }
        
        // Обновляем подсказку (скрываем, если все выбрано)
        updateAddToCartHint();
      } catch (error) {
        // Тихая ошибка, не влияет на работу
        console.warn('ProductPopup: ошибка обновления состояния корзины', error);
      }
    }, 0);
  }


  /**
   * Обновить только UI меню валюты (без полной перерисовки)
   */
  function updateCurrencyUI() {
    if (!popupElement) return;
    
    const btn = popupElement.querySelector('.product-popup__currency-btn');
    const dropdown = popupElement.querySelector('.product-popup__currency-dropdown');
    
    if (btn) {
      // Обновляем кнопку
      btn.textContent = state.currency.symbol;
      if (state.currencyMenuOpen) {
        btn.classList.add('product-popup__currency-btn--open');
      } else {
        btn.classList.remove('product-popup__currency-btn--open');
      }
    }
    
    if (dropdown) {
      // Обновляем видимость меню
      if (state.currencyMenuOpen) {
        dropdown.classList.add('product-popup__currency-dropdown--open');
      } else {
        dropdown.classList.remove('product-popup__currency-dropdown--open');
      }
      
      // Обновляем выделение выбранной валюты
      const items = dropdown.querySelectorAll('.product-popup__currency-item');
      items.forEach(item => {
        const itemCode = item.dataset.currencyCode;
        if (itemCode === state.currency.code) {
          item.classList.add('product-popup__currency-item--selected');
        } else {
          item.classList.remove('product-popup__currency-item--selected');
        }
      });
    }
  }

  /**
   * Обновить только цену (без перерисовки всего контента)
   */
  function updatePrice() {
    if (!popupElement || !state.product) return;
    
    const priceElement = popupElement.querySelector('.product-popup__price');
    const currencyElement = popupElement.querySelector('.product-popup__price-currency');
    
    if (priceElement && currencyElement) {
      const displayPrice = convertPrice(state.product.price);
      const currencyName = state.currency.code === 'RUB' ? 'руб.' : 
                          state.currency.code === 'USD' ? '$' :
                          state.currency.code === 'KZT' ? '₸' :
                          state.currency.code === 'KGS' ? 'с' : state.currency.symbol;
      
      priceElement.innerHTML = `${formatPrice(displayPrice)}<span class="product-popup__price-currency">${currencyName}</span>`;
    }
  }

  /**
   * Обновить UI
   */
  function updateUI() {
    if (!popupElement || !state.product) return;
    
    // Обновляем содержимое попапа
    const container = popupElement.querySelector('.product-popup__container');
    if (container) {
      // Извлекаем только внутреннее содержимое контейнера (без внешнего overlay)
      const renderedHTML = render();
      // Убираем внешний overlay div, оставляем только содержимое контейнера
      const innerContent = renderedHTML.replace(/^<div class="product-popup__overlay[^"]*"[^>]*>/, '').replace(/<\/div>\s*<\/div>\s*$/, '');
      container.innerHTML = innerContent;
      bindEvents();
    } else {
      // Если контейнер не найден, перерисовываем весь попап
      const renderedHTML = render();
      popupElement.innerHTML = renderedHTML;
      bindEvents();
    }
  }

  // ============================================
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ============================================

  /**
   * Открыть popup с товаром
   */
  async function open(productId) {
    console.log('[ProductPopup] open() вызвана с productId:', productId);
    const product = await loadProduct(productId);
    
    if (!product) {
      console.error('[ProductPopup] Товар не загружен, productId:', productId);
      // Показываем ошибку в UI без alert
      if (popupElement) {
        popupElement.innerHTML = '<div class="product-popup__error">Товар не найден. Попробуйте обновить страницу.</div>';
      }
      return;
    }
    
    console.log('[ProductPopup] Товар загружен успешно:', product.name || product.id);

    // Сброс состояния
    state = {
      product,
      selectedColor: null,
      selectedColorIndex: -1,
      meters: safeGet(product, 'order.min_meters', CONFIG.defaults.minMeters),
      rolls: 1,
      currency: CONFIG.currencies[0],
      currentImageIndex: 0,
      isOpen: true,
      currencyMenuOpen: false,
      colorsExpanded: false
    };

    // Синхронизируем рулоны с метрами
    state.rolls = syncMetersToRolls(state.meters);

    // Используем существующий попап или создаём новый
    let existingPopup = document.getElementById('productPopup');
    
    if (existingPopup) {
      popupElement = existingPopup;
      // Убеждаемся, что есть правильный класс
      if (!popupElement.classList.contains('product-popup-overlay')) {
        popupElement.classList.add('product-popup-overlay');
      }
      // Полностью заменяем содержимое новой структурой
      const renderedHTML = render();
      // Заменяем всё содержимое overlay
      popupElement.innerHTML = renderedHTML;
      
      // Если попап уже существовал, но обработчик не навешан - навешиваем
      if (!isClickHandlerAttached) {
        attachClickHandler();
      }
    } else {
      // Создаём новый попап
      popupElement = document.createElement('div');
      popupElement.id = 'productPopup';
      popupElement.className = 'product-popup-overlay';
      popupElement.innerHTML = render();
      document.body.appendChild(popupElement);
      
      // Навешиваем стабильный делегированный обработчик клика ОДИН РАЗ
      // ДО любых обновлений innerHTML
      attachClickHandler();
    }
    
    // Если попап уже существовал, но обработчик не навешан - навешиваем
    if (!isClickHandlerAttached) {
      attachClickHandler();
    }
    
    // Убеждаемся, что контейнер имеет правильные стили
    const container = popupElement.querySelector('.product-popup__container');
    if (container) {
      // Устанавливаем фиксированные размеры для единообразия
      container.style.maxWidth = '800px';
      container.style.width = '90%';
      container.style.margin = '0 auto';
    }
    
    // Показываем попап
    popupElement.classList.add('active');
    console.log('[ProductPopup] Попап добавлен в DOM, класс active установлен');
    console.log('[ProductPopup] popupElement в DOM:', document.body.contains(popupElement));
    console.log('[ProductPopup] Классы popupElement:', popupElement.className);
    console.log('[ProductPopup] Computed display:', window.getComputedStyle(popupElement).display);
    console.log('[ProductPopup] Computed visibility:', window.getComputedStyle(popupElement).visibility);
    console.log('[ProductPopup] Computed opacity:', window.getComputedStyle(popupElement).opacity);

    // Phase 6: Lock scroll
    // ScrollLock handles ALL scroll position management
    if (window.ScrollLock) {
      window.ScrollLock.lock('product-popup');
    }

    document.body.classList.add('popup-open'); // CSS hook

    bindEvents();
    
    // Обновляем состояние корзины после открытия (с небольшой задержкой для гарантии инициализации)
    setTimeout(() => {
      updateCartStateUI();
    }, 100);
  }

  /**
   * Закрыть popup
   */
  function close() {
    unbindEvents();

    // Удаляем подсказку при закрытии попапа
    hideAddToCartHint();
    const hint = document.querySelector('.product-popup__add-hint');
    if (hint) {
      hint.remove();
    }

    if (popupElement) {
      popupElement.remove();
      popupElement = null;
      isClickHandlerAttached = false;
    }

    // Phase 6: Unlock scroll
    // ScrollLock handles ALL scroll position management
    if (window.ScrollLock) {
      window.ScrollLock.unlock('product-popup');
    }

    document.body.classList.remove('popup-open');

    console.log('[ProductPopup] Попап закрыт');

    state.isOpen = false;
    state.product = null;
  }

  /**
   * Проверка открыт ли popup
   */
  function isOpen() {
    return state.isOpen;
  }

  // ============================================
  // УТИЛИТЫ
  // ============================================

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
  }

  function pluralize(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    
    if (mod100 >= 11 && mod100 <= 19) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
  }

  // ============================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================

  /**
   * Слушаем событие от каталога
   */
  let isOpening = false; // Флаг для предотвращения двойного открытия
  
  function init() {
    console.log('[ProductPopup] Инициализация обработчиков событий');
    
    // Слушаем обычные события документа
    document.addEventListener('catalog:openProduct', (event) => {
      console.log('[ProductPopup] Получено событие catalog:openProduct через document:', event.detail);
      const { productId } = event.detail;
      if (productId && !isOpening) {
        isOpening = true;
        console.log('[ProductPopup] Вызываю open() с productId:', productId);
        open(productId).finally(() => {
          isOpening = false;
        });
      } else if (isOpening) {
        console.log('[ProductPopup] Попап уже открывается, игнорирую событие');
      } else {
        console.warn('[ProductPopup] productId не найден в event.detail:', event.detail);
      }
    });
    
    // Слушаем события через CatalogEventBus (для совместимости)
    if (typeof window.CatalogEventBus !== 'undefined') {
      console.log('[ProductPopup] CatalogEventBus найден, регистрирую обработчик');
      window.CatalogEventBus.on('catalog:openProduct', function(data) {
        console.log('[ProductPopup] Получено событие catalog:openProduct через CatalogEventBus:', data);
        const productId = data && data.productId;
        // Пропускаем события через EventBus, если уже обрабатываем через document
        // (productCard.js отправляет оба события, чтобы избежать двойного открытия)
        if (productId && !isOpening) {
          isOpening = true;
          console.log('[ProductPopup] Вызываю open() с productId через EventBus:', productId);
          open(productId).finally(() => {
            isOpening = false;
          });
        } else if (isOpening) {
          console.log('[ProductPopup] Попап уже открывается, игнорирую событие EventBus');
        } else {
          console.warn('[ProductPopup] productId не найден в data:', data);
        }
      });
    } else {
      console.warn('[ProductPopup] CatalogEventBus не найден');
    }
    
    // Слушаем обновления корзины
    document.addEventListener('cart:updated', () => {
      if (state.isOpen) {
        updateCartStateUI();
      }
    });
  }

  // Автоинициализация при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================
  // ПУБЛИЧНЫЙ API
  // ============================================

  return {
    open,
    close,
    isOpen
  };

})();

// Экспорт для модулей
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductPopup;
}

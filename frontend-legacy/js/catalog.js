/**
 * CATALOG.JS
 * Модуль каталога товаров
 * 
 * Отвечает за:
 * - Загрузку списка товаров
 * - Отображение превью-карточек
 * - Фильтрацию и сортировку
 * - Промо-блоки (новинки, акции)
 * 
 * НЕ отвечает за:
 * - Карточку товара (popup)
 * - Корзину
 * - Бизнес-логику заказов
 */

const Catalog = (function() {
  'use strict';

  // ============================================
  // ПРИВАТНЫЕ ПЕРЕМЕННЫЕ
  // ============================================
  
  const CONFIG = {
    dataPath: '/data/products/',
    indexFile: 'index.json',
    defaultImage: '/images/placeholder.jpg'
  };

  let isLoading = false;
  let hasError = false;

  // ============================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================

  /**
   * Загрузить индекс товаров и все товары
   */
  async function loadProducts(jsonPath = null) {
    if (isLoading) {
      return CatalogCore.getProducts();
    }
    
    isLoading = true;
    hasError = false;

    try {
      let source;

      if (jsonPath) {
        source = jsonPath;
      } else {
        source = CONFIG.dataPath + CONFIG.indexFile;
      }

      await CatalogCore.init(source);
      
      const products = CatalogCore.getProducts();
      console.log(`Каталог: загружено ${products.length} товаров`);
      
      return products;
    } catch (error) {
      console.error('Ошибка загрузки каталога:', error);
      hasError = true;
      return [];
    } finally {
      isLoading = false;
    }
  }

  /**
   * Валидация обязательных полей товара
   */
  function validateProduct(product) {
    const required = ['id', 'name', 'category', 'price', 'price_unit', 'image'];
    return required.every(field => {
      if (product[field] === undefined || product[field] === null) {
        console.warn(`Товар пропущен: отсутствует поле "${field}"`, product);
        return false;
      }
      return true;
    });
  }

  // ============================================
  // ФИЛЬТРАЦИЯ И СОРТИРОВКА
  // ============================================

  /**
   * Фильтровать товары
   * legacy proxy, логика перенесена в CatalogCore
   */
  function filterProducts() {
    CatalogCore.refresh();
    return CatalogCore.getProducts();
  }

  /**
   * Сортировать товары
   * legacy proxy, логика перенесена в CatalogCore
   */
  function sortProducts() {
    CatalogCore.refresh();
    return CatalogCore.getProducts();
  }

  // ============================================
  // ПОЛУЧЕНИЕ ДАННЫХ ДЛЯ ОТОБРАЖЕНИЯ
  // ============================================

  /**
   * Получить все товары (отфильтрованные)
   */
  function getProducts() {
    return CatalogCore.getProducts();
  }

  /**
   * Получить товары для промо-блока "Новинки"
   */
  function getNewProducts(limit = 6) {
    const allProducts = CatalogCore.getProducts();
    return allProducts
      .filter(p => p.is_new === true)
      .slice(0, limit);
  }

  /**
   * Получить товары для промо-блока "Акции"
   */
  function getSaleProducts(limit = 6) {
    const allProducts = CatalogCore.getProducts();
    return allProducts
      .filter(p => p.is_sale === true)
      .slice(0, limit);
  }

  /**
   * Получить товары "Скоро в наличии"
   */
  function getComingProducts(limit = 6) {
    const allProducts = CatalogCore.getProducts();
    return allProducts
      .filter(p => p.coming_soon === true)
      .slice(0, limit);
  }

  /**
   * Получить товары по категории
   */
  function getProductsByCategory(category, limit = null) {
    const allProducts = CatalogCore.getProducts();
    const result = allProducts.filter(p => p.category === category);
    return limit ? result.slice(0, limit) : result;
  }

  /**
   * Получить уникальные категории
   */
  function getCategories() {
    const allProducts = CatalogCore.getProducts();
    const categories = new Set(allProducts.map(p => p.category));
    return Array.from(categories);
  }

  // ============================================
  // РЕНДЕРИНГ КАРТОЧКИ ПРЕВЬЮ
  // ============================================

  /**
   * Создать HTML карточки товара для каталога
   * @param {Object} product - данные товара
   * @returns {string} HTML-строка
   */
  function renderProductCard(product) {
    const flags = renderFlags({
      new: product.is_new,
      sale: product.is_sale,
      coming: product.coming_soon
    });
    const colorsCount = product.colors?.length || 0;
    const colorsText = colorsCount > 0 ? `${colorsCount} ${pluralize(colorsCount, 'цвет', 'цвета', 'цветов')}` : '';

    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}">
        <div class="product-card__image-wrapper">
          <img 
            src="${escapeHtml(product.image)}" 
            alt="${escapeHtml(product.name)}"
            class="product-card__image"
            loading="lazy"
            onerror="this.src='${CONFIG.defaultImage}'"
          />
          ${flags}
        </div>
        <div class="product-card__content">
          <p class="product-card__category">${escapeHtml(product.category)}</p>
          <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
          <div class="product-card__footer">
            <span class="product-card__price">
              ${formatPrice(product.price)} ${escapeHtml(product.price_unit)}
            </span>
            ${colorsText ? `<span class="product-card__colors">${colorsText}</span>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Рендер флагов (новинка, акция, скоро)
   */
  function renderFlags(flags) {
    if (!flags) return '';

    const badges = [];
    
    if (flags.new) {
      badges.push('<span class="product-card__badge product-card__badge--new">Новинка</span>');
    }
    if (flags.sale) {
      badges.push('<span class="product-card__badge product-card__badge--sale">Акция</span>');
    }
    if (flags.coming) {
      badges.push('<span class="product-card__badge product-card__badge--coming">Скоро</span>');
    }

    return badges.length > 0 
      ? `<div class="product-card__badges">${badges.join('')}</div>` 
      : '';
  }

  /**
   * Отрисовать каталог в контейнер
   * @param {string|HTMLElement} container - селектор или элемент
   */
  function renderCatalog(container) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;

    if (!el) {
      console.error('Catalog: контейнер не найден');
      return;
    }

    // ERROR STATE
    if (hasError) {
      el.innerHTML = '<div class="catalog__error">Ошибка загрузки каталога. Попробуйте обновить страницу.</div>';
      updateShowMoreButtonVisibility();
      return;
    }

    // LOADING STATE
    if (isLoading) {
      el.innerHTML = '<div class="catalog__loading">Загрузка товаров…</div>';
      updateShowMoreButtonVisibility();
      return;
    }

    const products = CatalogCore.getProducts();

    // EMPTY STATE
    if (products.length === 0) {
      el.innerHTML = '<p class="catalog__empty">Товары не найдены</p>';
      updateShowMoreButtonVisibility();
      return;
    }

    // NORMAL STATE
    el.innerHTML = products.map(renderProductCard).join('');
    
    // Навешиваем обработчики клика
    el.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', handleProductClick);
    });

    updateShowMoreButtonVisibility();
  }

  /**
   * Отрисовать промо-блок
   * @param {string|HTMLElement} container - селектор или элемент
   * @param {Array} products - массив товаров
   */
  function renderPromoBlock(container, products) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;

    if (!el || products.length === 0) return;

    // Используем новую карточку для первого блока (newArrivals), чтобы показать разницу
    const elId = el ? el.id : '';
    const containerSelector = typeof container === 'string' ? container : '';
    const isNewArrivals = elId === 'newArrivals' || containerSelector === '#newArrivals';
    
    // Пытаемся использовать новую карточку для блока newArrivals
    if (isNewArrivals) {
      const CardRenderer = (typeof window !== 'undefined' && window.CatalogProductCard) || (typeof CatalogProductCard !== 'undefined' ? CatalogProductCard : null);
      
      if (CardRenderer && typeof CardRenderer.render === 'function') {
        // Очищаем контейнер
        el.innerHTML = '';
        
        // Рендерим новые карточки
        products.forEach(product => {
          // Адаптируем данные: id -> productId для новой карточки
          const adaptedProduct = {
            ...product,
            productId: product.productId || product.id,
            // Преобразуем булевы поля для новой карточки
            isNew: product.is_new || product.isNew,
            isComing: product.coming_soon || product.isComing,
            status: product.is_new ? 'new' : (product.coming_soon ? 'coming' : ''),
            // Преобразуем цену для новой карточки
            currency: product.price_unit || '₽',
            oldPrice: product.old_price || product.oldPrice,
            newPrice: product.price
          };
          
          try {
            const card = CardRenderer.render(adaptedProduct);
            if (card && card.nodeType) {
              el.appendChild(card);
            } else {
              console.warn('Catalog: карточка не создана для товара', adaptedProduct);
              // Fallback к старой карточке
              const oldCard = renderProductCard(product);
              el.insertAdjacentHTML('beforeend', oldCard);
            }
          } catch (error) {
            console.error('Catalog: ошибка рендера новой карточки:', error, adaptedProduct);
            // Fallback к старой карточке
            const oldCard = renderProductCard(product);
            el.insertAdjacentHTML('beforeend', oldCard);
          }
        });
        return; // Выходим, если использовали новую карточку
      } else {
        console.warn('Catalog: CatalogProductCard не найден, используем старую карточку для newArrivals');
      }
    }
    
    // Используем старую карточку для остальных блоков или если новая не загрузилась
    {
      // Используем старую карточку для остальных блоков
      el.innerHTML = products.map(renderProductCard).join('');
      
      el.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', handleProductClick);
      });
    }
  }

  /**
   * Отрисовать все промо-блоки на главной странице
   */
  function renderPromo() {
    renderPromoBlock('#newArrivals', getNewProducts(6));
    renderPromoBlock('#priceDrops', getSaleProducts(6));
    renderPromoBlock('#comingSoon', getComingProducts(6));
  }

  // ============================================
  // ОБНОВЛЕНИЕ КАТАЛОГА
  // ============================================

  /**
   * Обновить каталог при изменении фильтров / сортировки / пагинации
   */
  function refreshCatalog() {
    isLoading = true;
    CatalogPagination.reset();
    CatalogCore.refresh();
    isLoading = false;
    const products = CatalogCore.getProducts();
    return products;
  }

  /**
   * Обработчик кнопки "Показать ещё"
   */
  function handleShowMoreClick(event) {
    CatalogPagination.nextPage();
    CatalogCore.refresh();
    
    const button = event.currentTarget;
    const container = button.closest('.products-section, section')?.querySelector('.products-grid, [id*="catalog"], [class*="catalog"]');
    
    if (container) {
      renderCatalog(container);
    } else {
      const mainCatalog = document.querySelector('.products-grid, #catalog-grid, .catalog__grid, [id*="catalog"]');
      if (mainCatalog) {
        renderCatalog(mainCatalog);
      }
    }
  }

  /**
   * Обновить видимость кнопки "Показать ещё"
   */
  function updateShowMoreButtonVisibility() {
    const buttons = document.querySelectorAll('.show-more-btn');
    if (buttons.length === 0) return;

    const shownProducts = CatalogCore.getProducts();
    const totalCount = CatalogCore.getTotalCount();
    
    const allShown = shownProducts.length >= totalCount;
    
    buttons.forEach(button => {
      button.style.display = allShown ? 'none' : 'block';
    });
  }

  // ============================================
  // ОБРАБОТЧИКИ СОБЫТИЙ
  // ============================================

  /**
   * Клик по карточке товара
   */
  function handleProductClick(event) {
    const card = event.currentTarget;
    const productId = card.dataset.productId;
    
    console.log('Клик по карточке, productId:', productId);
    
    if (!productId) {
      console.warn('ProductId не найден');
      return;
    }

    // Отправляем кастомное событие
    // product-popup.js слушает это событие
    const openEvent = new CustomEvent('catalog:openProduct', {
      detail: { productId },
      bubbles: true
    });
    
    document.dispatchEvent(openEvent);
    console.log('Событие catalog:openProduct отправлено');
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
  // ПУБЛИЧНЫЙ API
  // ============================================

  return {
    // Загрузка
    load: loadProducts,

    // Получение данных
    getProducts,
    getNewProducts,
    getSaleProducts,
    getComingProducts,
    getProductsByCategory,
    getCategories,

    // Фильтрация и сортировка
    filter: filterProducts,
    sort: sortProducts,

    // Обновление
    refresh: refreshCatalog,

    // Рендеринг
    render: renderCatalog,
    renderPromo: renderPromo,
    renderPromoBlock: renderPromoBlock,
    renderCard: renderProductCard,

    // Инициализация
    init: function() {
      // Инициализация обработчиков событий (если нужно)
      // Пока функция пустая, так как обработчики навешиваются автоматически
      return true;
    }
  };

})();

// Экспорт для глобального доступа
if (typeof window !== 'undefined') {
  window.Catalog = Catalog;
}

// Экспорт для модулей (если используется)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Catalog;
}

/**
 * ProductCard - Рендер карточки товара в каталоге (PREVIEW)
 * Автоматический выбор параметров, без хардкода
 */
const CatalogProductCard = (function() {
    'use strict';

    // Приоритет параметров для отображения
    const PARAM_PRIORITY = [
        'composition',
        'density', 
        'width',
        'material',
        'weight',
        'country'
    ];

    // Количество параметров в превью
    const MAX_PARAMS = 3;

    // Метки для параметров
    const PARAM_LABELS = {
        'composition': 'Состав',
        'density': 'Плотность',
        'width': 'Ширина',
        'material': 'Материал',
        'weight': 'Вес',
        'country': 'Страна'
    };

    /**
     * Создание HTML карточки товара
     * @param {Object} product - Данные продукта
     * @returns {HTMLElement}
     */
    function render(product) {
        // Поддерживаем оба варианта: productId и id
        const productId = product?.productId || product?.id;
        
        if (!product || !productId) {
            console.error('Catalog: Невалидные данные продукта', product);
            return null;
        }

        const card = document.createElement('article');
        card.className = 'catalog-card';
        card.dataset.productId = productId;

        // Вся карточка кликабельна
        card.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[CatalogProductCard] Клик по карточке товара, productId:', productId);
            // Используем и CatalogEventBus и обычные события для совместимости
            if (typeof CatalogEventBus !== 'undefined') {
                console.log('[CatalogProductCard] Отправляю событие через CatalogEventBus');
                CatalogEventBus.emit('catalog:openProduct', { productId: productId });
            } else {
                console.warn('[CatalogProductCard] CatalogEventBus не найден');
            }
            // Также отправляем обычное событие для совместимости
            const event = new CustomEvent('catalog:openProduct', {
                detail: { productId: productId },
                bubbles: true
            });
            console.log('[CatalogProductCard] Отправляю событие через document.dispatchEvent');
            document.dispatchEvent(event);
        });

        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Открыть ${product.name || 'товар'}`);

        // Обработка Enter для доступности
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (typeof CatalogEventBus !== 'undefined') {
                    CatalogEventBus.emit('catalog:openProduct', { productId: productId });
                }
                const event = new CustomEvent('catalog:openProduct', {
                    detail: { productId: productId },
                    bubbles: true
                });
                document.dispatchEvent(event);
            }
        });

        // Сборка HTML
        card.innerHTML = `
            ${renderBadges(product)}
            ${renderImage(product)}
            ${renderContent(product)}
        `;

        return card;
    }

    /**
     * Рендер бейджей
     */
    function renderBadges(product) {
        const badges = [];

        // Скидка
        if (hasDiscount(product)) {
            const discount = calculateDiscount(product);
            badges.push(`<span class="catalog-card__badge catalog-card__badge--sale">-${discount}%</span>`);
        }

        // Новинка
        if (product.isNew || product.new || product.status === 'new') {
            badges.push(`<span class="catalog-card__badge catalog-card__badge--new">Новинка</span>`);
        }

        // В пути
        if (product.status === 'coming' || product.isComing) {
            badges.push(`<span class="catalog-card__badge catalog-card__badge--coming">В пути</span>`);
        }

        if (badges.length === 0) return '';

        return `<div class="catalog-card__badges">${badges.join('')}</div>`;
    }

    /**
     * Проверка наличия скидки
     */
    function hasDiscount(product) {
        const oldPrice = product.oldPrice || product.old_price;
        const newPrice = product.newPrice || product.price;
        return oldPrice && newPrice && oldPrice > newPrice;
    }

    /**
     * Расчёт процента скидки
     */
    function calculateDiscount(product) {
        const oldPrice = product.oldPrice || product.old_price;
        const newPrice = product.newPrice || product.price;
        if (!oldPrice || !newPrice || oldPrice <= newPrice) return 0;
        return Math.round((1 - newPrice / oldPrice) * 100);
    }

    /**
     * Рендер изображения
     */
    function renderImage(product) {
        const imageSrc = product.image || product.thumbnail || product.images?.[0] || '/images/placeholder.jpg';
        const altText = product.name || 'Товар';

        return `
            <div class="catalog-card__image-wrapper">
                <img 
                    class="catalog-card__image" 
                    src="${escapeHtml(imageSrc)}" 
                    alt="${escapeHtml(altText)}"
                    loading="lazy"
                >
            </div>
        `;
    }

    /**
     * Рендер контента карточки
     */
    function renderContent(product) {
        return `
            <div class="catalog-card__content">
                <h3 class="catalog-card__title">${escapeHtml(product.name || 'Без названия')}</h3>
                ${renderPrice(product)}
                ${renderColors(product)}
            </div>
        `;
    }

    /**
     * Рендер цены
     */
    function renderPrice(product) {
        const currency = product.currency || '₽';
        const oldPrice = product.oldPrice || product.old_price;
        const currentPrice = product.newPrice || product.price;

        if (!currentPrice && currentPrice !== 0) {
            return '<div class="catalog-card__price">Цена по запросу</div>';
        }

        let priceHtml = '';

        if (oldPrice && oldPrice > currentPrice) {
            priceHtml = `
                <span class="catalog-card__price-old">${formatPrice(oldPrice)} ${escapeHtml(currency)}</span>
                <span class="catalog-card__price-current catalog-card__price-current--sale">${formatPrice(currentPrice)} ${escapeHtml(currency)}</span>
            `;
        } else {
            priceHtml = `
                <span class="catalog-card__price-current">${formatPrice(currentPrice)} ${escapeHtml(currency)}</span>
            `;
        }

        return `<div class="catalog-card__price">${priceHtml}</div>`;
    }

    /**
     * Рендер параметров (2-3 автоматически)
     */
    function renderParams(product) {
        const params = selectParams(product);

        if (params.length === 0) return '';

        const paramsHtml = params.map(param => `
            <div class="catalog-card__param">
                <span class="catalog-card__param-label">${escapeHtml(param.label)}:</span>
                <span class="catalog-card__param-value">${escapeHtml(param.value)}</span>
            </div>
        `).join('');

        return `<div class="catalog-card__params">${paramsHtml}</div>`;
    }

    /**
     * Выбор параметров по приоритету
     */
    function selectParams(product) {
        const selected = [];

        // Сначала по приоритету
        for (const key of PARAM_PRIORITY) {
            if (selected.length >= MAX_PARAMS) break;

            // Получаем значение напрямую из объекта или через CatalogDataStore, если доступен
            let value = product[key];
            if ((value === null || value === undefined || value === '') && typeof CatalogDataStore !== 'undefined' && CatalogDataStore.getNestedValue) {
                value = CatalogDataStore.getNestedValue(product, key);
            }
            
            if (value !== null && value !== undefined && value !== '') {
                selected.push({
                    label: PARAM_LABELS[key] || key,
                    value: formatParamValue(key, value)
                });
            }
        }

        // Если мало — добавляем остальные
        if (selected.length < MAX_PARAMS) {
            const usedKeys = new Set(PARAM_PRIORITY);
            const excludeKeys = new Set(['productId', 'id', 'name', 'title', 'image', 'images', 
                'thumbnail', 'description', 'price', 'oldPrice', 'old_price', 'newPrice',
                'currency', 'status', 'isNew', 'new', 'isComing', 'colors', 'color', 'category']);

            for (const key in product) {
                if (selected.length >= MAX_PARAMS) break;
                if (usedKeys.has(key) || excludeKeys.has(key)) continue;

                const value = product[key];
                if (value !== null && value !== undefined && value !== '' && 
                    typeof value !== 'object') {
                    selected.push({
                        label: PARAM_LABELS[key] || formatLabel(key),
                        value: formatParamValue(key, value)
                    });
                }
            }
        }

        return selected;
    }

    /**
     * Форматирование значения параметра
     */
    function formatParamValue(key, value) {
        if (Array.isArray(value)) {
            return value.join(', ');
        }

        // Добавляем единицы измерения
        const units = {
            'density': 'г/м²',
            'width': 'см',
            'weight': 'г'
        };

        if (units[key] && typeof value === 'number') {
            return `${value} ${units[key]}`;
        }

        return String(value);
    }

    /**
     * Форматирование ключа в label
     */
    function formatLabel(key) {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    }

    /**
     * Рендер количества цветов
     */
    function renderColors(product) {
        const colors = product.colors || product.color;

        if (!colors) return '';

        let colorCount = 0;

        if (Array.isArray(colors)) {
            colorCount = colors.length;
        } else if (typeof colors === 'number') {
            colorCount = colors;
        } else if (typeof colors === 'string') {
            colorCount = 1;
        }

        if (colorCount === 0) return '';

        const text = pluralize(colorCount, 'цвет', 'цвета', 'цветов');

        return `
            <div class="catalog-card__colors">
                <span class="catalog-card__colors-count">${colorCount} ${text}</span>
            </div>
        `;
    }

    /**
     * Склонение слов
     */
    function pluralize(count, one, few, many) {
        const mod10 = count % 10;
        const mod100 = count % 100;

        if (mod100 >= 11 && mod100 <= 14) return many;
        if (mod10 === 1) return one;
        if (mod10 >= 2 && mod10 <= 4) return few;
        return many;
    }

    /**
     * Форматирование цены
     */
    function formatPrice(price) {
        return new Intl.NumberFormat('ru-RU').format(price);
    }

    /**
     * Экранирование HTML
     */
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    return {
        render
    };
})();

// Экспорт для глобального доступа
if (typeof window !== 'undefined') {
    window.CatalogProductCard = CatalogProductCard;
}

/**
 * Integration - Точки интеграции с popup и корзиной
 * Каталог НЕ знает о popup и корзине напрямую — только события
 */

/**
 * =====================================================
 * POPUP КАРТОЧКИ ТОВАРА — ТОЧКА ИНТЕГРАЦИИ
 * =====================================================
 * 
 * Popup должен подписаться на событие catalog:openProduct
 * и самостоятельно загрузить данные товара.
 * 
 * Пример реализации (НЕ часть каталога):
 * 
 * CatalogEventBus.on('catalog:openProduct', function(data) {
 *     const { productId } = data;
 *     // Открыть popup, загрузить данные товара
 * });
 */

/**
 * =====================================================
 * КОРЗИНА (ЧИСТАЯ ЗАЯВКА) — ТОЧКА ИНТЕГРАЦИИ
 * =====================================================
 * 
 * Корзина должна подписаться на событие product:addToCart
 * и хранить ТОЛЬКО контракт:
 * {
 *   productId: string,
 *   color: string | null,
 *   meters: number,
 *   rolls: number
 * }
 * 
 * ❌ name, price, image, description, totalPrice — ЗАПРЕЩЕНЫ
 * 
 * Пример реализации (НЕ часть каталога):
 * 
 * CatalogEventBus.on('product:addToCart', function(data) {
 *     const { productId, color, meters, rolls } = data;
 *     // Добавить в корзину
 * });
 */

/**
 * =====================================================
 * СПИСОК СОБЫТИЙ (СТРОГО)
 * =====================================================
 * 
 * catalog:init        — инициализация каталога
 * catalog:loaded      — данные загружены
 * catalog:filtered    — фильтры/сортировка изменены
 * catalog:render      — рендер продуктов
 * catalog:openProduct — открытие popup товара
 * product:addToCart   — добавление в корзину
 * cart:updated        — корзина обновлена
 * 
 * ❌ Другие события запрещены
 * ❌ Прямые импорты между модулями запрещены
 */

// Экспорт для документации
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EVENTS: [
            'catalog:init',
            'catalog:loaded', 
            'catalog:filtered',
            'catalog:render',
            'catalog:openProduct',
            'product:addToCart',
            'cart:updated'
        ],
        CART_CONTRACT: {
            productId: 'string',
            color: 'string | null',
            meters: 'number',
            rolls: 'number'
        }
    };
}

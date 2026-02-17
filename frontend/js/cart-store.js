/**
 * CART-STORE.JS
 * Модуль хранения корзины (заявок)
 * 
 * PHASE 3: Использует CartAPI для синхронизации с backend'ом
 * Локальное хранилище используется как fallback
 * 
 * Отвечает за:
 * - Синхронизацию с backend API
 * - Приём событий product:addToCart
 * - Кэширование корзины в localStorage
 * - API для работы с корзиной
 * 
 * КОНТРАКТ ITEM:
 * { productId, color, meters, rolls }
 */

const CartStore = (function() {
  'use strict';

  // ============================================
  // КОНФИГУРАЦИЯ
  // ============================================

  const STORAGE_KEY = 'fabric_store_cart';
  const USE_API = typeof CartAPI !== 'undefined'; // PHASE 3: Флаг использования API

  // ============================================
  // СОСТОЯНИЕ
  // ============================================

  let items = [];
  let isLoadingFromAPI = false;

  // ============================================
  // API SYNC (PHASE 3)
  // ============================================

  /**
   * Загрузить корзину из API
   */
  async function loadFromAPI() {
    if (!USE_API) {
      console.warn('[CartStore] CartAPI не доступен, используем localStorage');
      return false;
    }

    if (isLoadingFromAPI) {
      return false;
    }

    isLoadingFromAPI = true;

    try {
      const result = await CartAPI.getCart();

      if (!result.success) {
        console.error('[CartStore] API ошибка при загрузке:', result.error);
        return false;
      }

      // Преобразуем данные из API
      const apiItems = result.data.items || result.data || [];
      items = adaptApiItemsToCart(apiItems);

      console.log('[CartStore] Загружено из API:', items.length, 'позиций');
      
      // Сохраняем в localStorage как кэш
      saveToStorage();
      
      return true;
    } catch (error) {
      console.error('[CartStore] Ошибка загрузки из API:', error);
      return false;
    } finally {
      isLoadingFromAPI = false;
    }
  }

  /**
   * Адаптировать данные из API в формат CartStore
   */
  function adaptApiItemsToCart(apiItems) {
    if (!Array.isArray(apiItems)) {
      return [];
    }

    return apiItems.map(item => ({
      productId: item.productId || item.id,
      color: item.color || null,
      meters: item.meters || item.requestedMeters || 0,
      rolls: item.rolls || 0
    }));
  }

  // ============================================
  // LOCALSTORAGE (Fallback / Cache)
  // ============================================

  /**
   * Загрузить корзину из localStorage
   */
  function loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        items = JSON.parse(data);
      }
    } catch (e) {
      console.warn('[CartStore] Ошибка чтения localStorage', e);
      items = [];
    }
  }

  /**
   * Сохранить корзину в localStorage
   */
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[CartStore] Ошибка записи localStorage', e);
    }
  }

  // ============================================
  // ВАЛИДАЦИЯ
  // ============================================

  /**
   * Проверить, что item соответствует контракту
   */
  function isValidItem(item) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.productId !== 'string') return false;
    if (typeof item.meters !== 'number' || item.meters <= 0) return false;
    if (typeof item.rolls !== 'number' || item.rolls <= 0) return false;
    // color может быть string или null
    if (item.color !== null && typeof item.color !== 'string') return false;
    return true;
  }

  // ============================================
  // ПУБЛИЧНЫЕ МЕТОДЫ (PHASE 3: с API поддержкой)
  // ============================================

  /**
   * Добавить товар в корзину
   * PHASE 3: отправляет на backend через API
   */
  async function add(item) {
    if (!isValidItem(item)) {
      console.warn('[CartStore] Невалидный item', item);
      return { success: false, error: 'Invalid item' };
    }

    const cleanItem = {
      productId: item.productId,
      color: item.color || null,
      meters: item.meters,
      rolls: item.rolls
    };

    // PHASE 3: Если API доступен, отправляем на backend
    if (USE_API && !isLoadingFromAPI) {
      try {
        const result = await CartAPI.addToCart(cleanItem);
        
        if (!result.success) {
          console.error('[CartStore] Ошибка при добавлении в корзину:', result.error);
          // Fallback: добавляем локально
          return _addLocalItem(cleanItem);
        }

        console.log('[CartStore] Товар добавлен в корзину через API');
        
        // Перезагружаем корзину из API, чтобы синхронизировать
        await loadFromAPI();
        
        return { success: true, data: cleanItem };
      } catch (error) {
        console.error('[CartStore] Ошибка API:', error);
        // Fallback: добавляем локально
        return _addLocalItem(cleanItem);
      }
    } else {
      // Fallback: добавляем локально
      return _addLocalItem(cleanItem);
    }
  }

  /**
   * Добавить товар в локальную корзину (fallback)
   */
  function _addLocalItem(cleanItem) {
    const existingItem = items.find(existing => 
      existing.productId === cleanItem.productId && 
      existing.color === cleanItem.color
    );

    if (existingItem) {
      const oldMeters = existingItem.meters;
      const oldRolls = existingItem.rolls;
      existingItem.meters += cleanItem.meters;
      existingItem.rolls += cleanItem.rolls;
      console.log('[CartStore] Товар объединён локально', { 
        productId: cleanItem.productId, 
        color: cleanItem.color,
        oldMeters: oldMeters,
        oldRolls: oldRolls,
        newMeters: existingItem.meters,
        newRolls: existingItem.rolls
      });
    } else {
      items.push(cleanItem);
      console.log('[CartStore] Товар добавлен локально', cleanItem);
    }

    saveToStorage();

    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: { count: items.length }
    }));

    return { success: true, data: cleanItem };
  }

  /**
   * Получить все товары
   */
  function getAll() {
    return [...items];
  }

  /**
   * Получить количество позиций
   */
  function getCount() {
    return items.length;
  }

  /**
   * Очистить корзину
   */
  function clear() {
    items = [];
    saveToStorage();

    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: { count: 0 }
    }));
  }

  /**
   * Удалить товар по индексу или ID
   */
  async function remove(indexOrId) {
    const index = typeof indexOrId === 'number' ? indexOrId : 
                  items.findIndex(item => item.productId === indexOrId);

    if (index < 0 || index >= items.length) {
      console.warn('[CartStore] Позиция не найдена:', indexOrId);
      return { success: false, error: 'Item not found' };
    }

    const item = items[index];

    // PHASE 3: Если API доступен, удаляем через API
    if (USE_API) {
      try {
        // Находим ID товара в корзине (если есть из API)
        const itemId = item.id || item.productId;
        const result = await CartAPI.removeFromCart(itemId);
        
        if (!result.success) {
          console.error('[CartStore] Ошибка при удалении:', result.error);
          // Fallback: удаляем локально
          return _removeLocalItem(index);
        }

        console.log('[CartStore] Товар удалён через API');
        
        // Перезагружаем корзину
        await loadFromAPI();
        
        return { success: true };
      } catch (error) {
        console.error('[CartStore] Ошибка API:', error);
        return _removeLocalItem(index);
      }
    } else {
      return _removeLocalItem(index);
    }
  }

  /**
   * Удалить товар локально (fallback)
   */
  function _removeLocalItem(index) {
    if (index >= 0 && index < items.length) {
      items.splice(index, 1);
      saveToStorage();

      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { count: items.length }
      }));

      return { success: true };
    }

    return { success: false };
  }

  /**
   * Очистить корзину
   */
  async function clear() {
    // PHASE 3: Если API доступен, очищаем через API
    if (USE_API) {
      try {
        const result = await CartAPI.clearCart();
        
        if (!result.success) {
          console.error('[CartStore] Ошибка при очистке:', result.error);
          // Fallback
          _clearLocal();
          return { success: false };
        }

        console.log('[CartStore] Корзина очищена через API');
        
        // Перезагружаем (должна быть пустой)
        await loadFromAPI();
        
        return { success: true };
      } catch (error) {
        console.error('[CartStore] Ошибка API:', error);
        _clearLocal();
        return { success: false };
      }
    } else {
      _clearLocal();
      return { success: true };
    }
  }

  /**
   * Очистить корзину локально (fallback)
   */
  function _clearLocal() {
    items = [];
    saveToStorage();

    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: { count: 0 }
    }));
  }

  // ============================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================

  async function init() {
    // PHASE 3: Сначала загружаем из API (если доступен)
    if (USE_API) {
      const apiLoaded = await loadFromAPI();
      if (apiLoaded) {
        console.log(`[CartStore] Загружено из API: ${items.length} позиций`);
      } else {
        // Fallback на localStorage
        loadFromStorage();
        console.log(`[CartStore] Загружено из localStorage: ${items.length} позиций (API недоступен)`);
      }
    } else {
      // Используем только localStorage
      loadFromStorage();
      console.log(`[CartStore] Загружено из localStorage: ${items.length} позиций`);
    }

    // Слушаем событие от popup
    document.addEventListener('product:addToCart', (event) => {
      if (event.detail) {
        add(event.detail);
      }
    });

    // Слушаем изменения loading state из ApiClient
    document.addEventListener('api:loading', (event) => {
      if (!event.detail.isLoading) {
        // Когда API заканчивает запросы, можем обновить UI
      }
    });
  }

  // Автоинициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================
  // ПУБЛИЧНЫЙ API
  // ============================================

  return {
    // PHASE 3: Все методы теперь асинхронные
    add,
    remove,
    clear,
    
    // Синхронные методы (локальное состояние)
    getAll,
    getCount,
    
    // PHASE 3: Управление API
    loadFromAPI,
    getLoadingState: () => isLoadingFromAPI
  };

})();

// Экспорт в глобальную область
if (typeof window !== 'undefined') {
  window.CartStore = CartStore;
}

// Экспорт для модулей
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartStore;
}

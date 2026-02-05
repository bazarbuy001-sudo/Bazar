/**
 * CART-STORE.JS
 * Модуль хранения корзины (заявок)
 * 
 * Отвечает за:
 * - Приём событий product:addToCart
 * - Хранение заявок в памяти и localStorage
 * - API для работы с корзиной
 * 
 * НЕ отвечает за:
 * - UI корзины
 * - Цены, названия, изображения
 * - Оформление заказа
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

  // ============================================
  // СОСТОЯНИЕ
  // ============================================

  let items = [];

  // ============================================
  // LOCALSTORAGE
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
      console.warn('CartStore: ошибка чтения localStorage', e);
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
      console.warn('CartStore: ошибка записи localStorage', e);
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
  // ПУБЛИЧНЫЕ МЕТОДЫ
  // ============================================

  /**
   * Добавить товар в корзину
   */
  function add(item) {
    if (!isValidItem(item)) {
      console.warn('CartStore: невалидный item', item);
      return false;
    }

    // Сохраняем ТОЛЬКО контрактные поля
    const cleanItem = {
      productId: item.productId,
      color: item.color,
      meters: item.meters,
      rolls: item.rolls
    };

    // Ищем существующий элемент с тем же productId и color
    const existingItem = items.find(existing => 
      existing.productId === cleanItem.productId && 
      existing.color === cleanItem.color
    );

    if (existingItem) {
      // Объединяем: увеличиваем meters и rolls
      const oldMeters = existingItem.meters;
      const oldRolls = existingItem.rolls;
      existingItem.meters += cleanItem.meters;
      existingItem.rolls += cleanItem.rolls;
      console.log('CartStore: merged item', { 
        productId: cleanItem.productId, 
        color: cleanItem.color,
        addedMeters: cleanItem.meters,
        addedRolls: cleanItem.rolls,
        oldMeters: oldMeters,
        oldRolls: oldRolls,
        newMeters: existingItem.meters,
        newRolls: existingItem.rolls
      });
    } else {
      // Добавляем новую позицию
      items.push(cleanItem);
      console.log('CartStore: added new item', { 
        productId: cleanItem.productId, 
        color: cleanItem.color,
        meters: cleanItem.meters,
        rolls: cleanItem.rolls
      });
    }

    saveToStorage();

    // Уведомляем об изменении
    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: { count: items.length }
    }));

    return true;
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
   * Удалить товар по индексу
   */
  function remove(index) {
    if (index >= 0 && index < items.length) {
      items.splice(index, 1);
      saveToStorage();

      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { count: items.length }
      }));
    }
  }

  // ============================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================

  function init() {
    // Загружаем из localStorage
    loadFromStorage();

    // Слушаем событие от popup
    document.addEventListener('product:addToCart', (event) => {
      if (event.detail) {
        add(event.detail);
      }
    });

    console.log(`CartStore: загружено ${items.length} позиций`);
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
    add,
    getAll,
    getCount,
    clear,
    remove
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

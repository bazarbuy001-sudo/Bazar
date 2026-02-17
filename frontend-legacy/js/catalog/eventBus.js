/**
 * EventBus - Централизованная шина событий
 * С исправленной подпиской/отпиской и доп. утилитами
 */
const CatalogEventBus = (function() {
    'use strict';

    // Хранилище зарегистрированных обработчиков для корректной отписки
    const listeners = new Map(); // eventName -> Set of {handler, wrapper}

    function ensureSet(eventName) {
        if (!listeners.has(eventName)) listeners.set(eventName, new Set());
        return listeners.get(eventName);
    }

    /**
     * Подписка на событие
     * @param {string} eventName
     * @param {Function} handler - функция, которая получит payload (detail)
     * @returns {Function} - unsubscribe
     */
    function on(eventName, handler) {
        if (typeof handler !== 'function') throw new TypeError('handler must be a function');

        // Обёртка для передачи только payload в обработчик
        const wrapper = function(event) {
            try {
                handler(event.detail);
            } catch (err) {
                // Не ломать EventBus при ошибках обработчиков
                console.error('[CatalogEventBus] handler error for', eventName, err);
            }
        };

        document.addEventListener(eventName, wrapper);

        const set = ensureSet(eventName);
        set.add({ handler, wrapper });

        // Функция отписки
        return function unsubscribe() {
            off(eventName, handler);
        };
    }

    /**
     * Отписка от события
     * Если передан handler — удаляет только его, иначе удаляет все слушатели для события
     * @param {string} eventName
     * @param {Function} [handler]
     */
    function off(eventName, handler) {
        if (!listeners.has(eventName)) return;

        const set = listeners.get(eventName);

        if (typeof handler === 'function') {
            // Найдем соответствующую пару и удалим
            for (const entry of Array.from(set)) {
                if (entry.handler === handler) {
                    document.removeEventListener(eventName, entry.wrapper);
                    set.delete(entry);
                }
            }
        } else {
            // Удалить все
            for (const entry of Array.from(set)) {
                document.removeEventListener(eventName, entry.wrapper);
            }
            set.clear();
        }

        if (set.size === 0) listeners.delete(eventName);
    }

    /**
     * Подписаться один раз
     */
    function once(eventName, handler) {
        const unsub = on(eventName, function(payload) {
            try {
                handler(payload);
            } finally {
                unsub();
            }
        });
        return unsub;
    }

    /**
     * Отправка события
     */
    function emit(eventName, payload) {
        const event = new CustomEvent(eventName, {
            detail: payload,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    return {
        on,
        off,
        once,
        emit,
        // Debug: return number of listeners for an event (or total if no name)
        listenerCount: function(eventName) {
            if (typeof eventName === 'string') {
                const set = listeners.get(eventName);
                return set ? set.size : 0;
            }
            // total listeners across all events
            let total = 0;
            for (const set of listeners.values()) total += set.size;
            return total;
        },
        // Debug: return map of eventName -> count
        getAllListenerCounts: function() {
            const out = {};
            for (const [name, set] of listeners.entries()) {
                out[name] = set.size;
            }
            return out;
        }
    };
})();

// Экспорт для глобального доступа
if (typeof window !== 'undefined') {
    window.CatalogEventBus = CatalogEventBus;
}

/**
 * searchController.js
 * Модуль поиска каталога
 * 
 * ЗАВИСИМОСТИ:
 * - CatalogDataStore (frontend/js/catalog/dataStore.js)
 * - CatalogEventBus (frontend/js/catalog/eventBus.js)
 * - CatalogFilters (frontend/js/catalog/filters.js) — опционально
 * 
 * ИСТОЧНИК ДАННЫХ:
 * - Поиск работает ТОЛЬКО по данным CatalogDataStore
 * - Результат поиска = отфильтрованный каталог
 * 
 * ИНДЕКСИРУЕМЫЕ ПОЛЯ:
 * - name
 * - category_name
 * - subcategory_name
 * - fabric_type_name
 * - все searchable=true фильтры (из specs)
 * 
 * СОБЫТИЯ:
 * - Слушает: catalog:loaded
 * - Эмитит: search:change, catalog:filtered
 * 
 * ПОВЕДЕНИЕ:
 * - debounce 300ms
 * - Пустая строка = сброс поиска
 * - Регистр не учитывается
 * - НЕ создаёт SEO-страницы
 * 
 * @version 1.0.0
 * @author Claude (по ТЗ BazarBuy)
 */

const SearchController = (function() {
    'use strict';

    // ============================================
    // СОСТОЯНИЕ
    // ============================================

    const state = {
        query: '',
        results: [],
        isSearching: false,
        inputElement: null,
        resultsElement: null,
        debounceTimer: null,
        initialized: false,
        eventsBound: false, // Phase 5C-4: Guard for EventBus subscriptions
        // хранит функцию отписки, возвращённую CatalogEventBus.on
        catalogLoadedUnsub: null
    };

    // Phase 5C-4: Store handler references for cleanup
    let handleKeydownRef = null;
    let handleClearRef = null;
    let handleSubmitRef = null;
    let clearButtonElement = null;
    let formElement = null;

    // ============================================
    // КОНФИГУРАЦИЯ
    // ============================================

    const CONFIG = {
        debounceDelay: 300,
        minQueryLength: 2,
        maxResults: 50
    };

    const SELECTORS = {
        input: '.search-input',
        results: '.search-results',
        clearButton: '.search-clear',
        form: '.search-form'
    };

    const CLASSES = {
        active: 'is-active',
        loading: 'is-loading',
        hasResults: 'has-results',
        empty: 'is-empty'
    };

    // ============================================
    // ПОЛЯ ДЛЯ ПОИСКА
    // ============================================

    /**
     * Поля для поиска (из ТЗ)
     * searchable=true означает, что поле участвует в поиске
     */
    const SEARCHABLE_FIELDS = {
        // Основные поля товара
        name: { weight: 10, path: 'name' },
        category: { weight: 8, path: 'category' }, // Основное поле категории в данных
        category_name: { weight: 5, path: 'category_name' }, // Резервное поле (для новых данных)
        fabric_type: { weight: 6, path: 'fabric_type' }, // Основное поле типа ткани в данных
        fabric_type_name: { weight: 8, path: 'fabric_type_name' }, // Резервное поле (для новых данных)
        subcategory_name: { weight: 5, path: 'subcategory_name' },
        
        // Поля из specs (searchable=true по таблице фильтров)
        composition: { weight: 3, path: 'specs.composition' },
        surface: { weight: 2, path: 'specs.surface' },
        season: { weight: 2, path: 'specs.season' },
        usage: { weight: 3, path: 'specs.usage' },
        country: { weight: 2, path: 'specs.country' },
        pattern: { weight: 2, path: 'specs.pattern' },
        
        // Поля из variants
        color: { weight: 4, path: 'variants[].color.name' },
        colors: { weight: 3, path: 'colors' } // Массив цветов (если есть в данных)
    };

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — ПОИСК
    // ============================================

    /**
     * Получить значение по пути в объекте
     * @param {Object} obj
     * @param {string} path
     * @returns {*}
     */
    function getValueByPath(obj, path) {
        if (!obj || !path) return null;

        // Обработка массивов (variants[].color.name)
        if (path.includes('[]')) {
            const [arrayPath, ...rest] = path.split('[].');
            const array = getValueByPath(obj, arrayPath);
            
            if (!Array.isArray(array)) return null;
            
            const restPath = rest.join('[].');
            return array.map(item => getValueByPath(item, restPath)).filter(Boolean);
        }

        // Обычный путь
        const parts = path.split('.');
        let value = obj;
        
        for (const part of parts) {
            if (value === null || value === undefined) return null;
            value = value[part];
        }
        
        return value;
    }

    /**
     * Нормализовать строку для поиска
     * @param {string} str
     * @returns {string}
     */
    function normalizeString(str) {
        if (!str) return '';
        return String(str)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    /**
     * Проверить, содержит ли значение поисковый запрос
     * @param {*} value
     * @param {string} query
     * @returns {boolean}
     */
    function matchesQuery(value, query) {
        if (value === null || value === undefined) return false;
        
        if (Array.isArray(value)) {
            return value.some(v => matchesQuery(v, query));
        }
        
        const normalizedValue = normalizeString(value);
        const normalizedQuery = normalizeString(query);
        
        return normalizedValue.includes(normalizedQuery);
    }

    /**
     * Рассчитать релевантность товара
     * @param {Object} product
     * @param {string} query
     * @returns {number}
     */
    function calculateRelevance(product, query) {
        let score = 0;
        const normalizedQuery = normalizeString(query);

        for (const [fieldKey, fieldConfig] of Object.entries(SEARCHABLE_FIELDS)) {
            const value = getValueByPath(product, fieldConfig.path);
            
            if (matchesQuery(value, normalizedQuery)) {
                score += fieldConfig.weight;
                
                // Бонус за точное совпадение в начале
                const normalizedValue = normalizeString(
                    Array.isArray(value) ? value[0] : value
                );
                if (normalizedValue.startsWith(normalizedQuery)) {
                    score += fieldConfig.weight * 0.5;
                }
                
                // Бонус за полное совпадение
                if (normalizedValue === normalizedQuery) {
                    score += fieldConfig.weight * 2;
                }
            }
        }

        return score;
    }

    /**
     * Выполнить поиск
     * @param {string} query
     * @returns {Array}
     */
    function performSearch(query) {
        if (!window.CatalogDataStore) {
            console.error('[SearchController] CatalogDataStore не найден');
            return [];
        }

        const allProducts = window.CatalogDataStore.getAllProducts();
        const normalizedQuery = normalizeString(query);

        if (!normalizedQuery || normalizedQuery.length < CONFIG.minQueryLength) {
            return [];
        }

        // Фильтруем и сортируем по релевантности
        const results = allProducts
            .filter(product => {
                // Пропускаем неактивные товары
                if (product.is_active === false) return false;

                // Проверяем совпадение хотя бы в одном поле
                for (const fieldConfig of Object.values(SEARCHABLE_FIELDS)) {
                    const value = getValueByPath(product, fieldConfig.path);
                    if (matchesQuery(value, normalizedQuery)) {
                        return true;
                    }
                }
                return false;
            })
            .map(product => ({
                product,
                relevance: calculateRelevance(product, normalizedQuery)
            }))
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, CONFIG.maxResults)
            .map(item => item.product);

        return results;
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — ОБРАБОТЧИКИ
    // ============================================

    /**
     * Обработчик ввода в поле поиска (с debounce)
     * @param {Event} event
     */
    function handleInput(event) {
        const query = event.target.value;

        // Очищаем предыдущий таймер
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
        }

        // Устанавливаем новый таймер
        state.debounceTimer = setTimeout(() => {
            executeSearch(query);
        }, CONFIG.debounceDelay);
    }

    /**
     * Выполнить поиск и обновить состояние
     * @param {string} query
     */
    function executeSearch(query) {
        state.query = query;
        state.isSearching = true;

        updateInputState();

        if (!query || query.length < CONFIG.minQueryLength) {
            // Сброс поиска
            state.results = [];
            state.isSearching = false;
            
            emitSearchChange(null);
            updateInputState();
            return;
        }

        // Выполняем поиск
        state.results = performSearch(query);
        state.isSearching = false;

        // Эмитим событие изменения поиска
        emitSearchChange(state.results);

        updateInputState();
    }

    /**
     * Обработчик очистки поиска
     * @param {Event} event
     */
    function handleClear(event) {
        event.preventDefault();
        
        state.query = '';
        state.results = [];
        
        if (state.inputElement) {
            state.inputElement.value = '';
            state.inputElement.focus();
        }

        emitSearchChange(null);
        updateInputState();
    }

    /**
     * Обработчик отправки формы
     * @param {Event} event
     */
    function handleSubmit(event) {
        event.preventDefault();
        
        // Очищаем debounce и выполняем немедленно
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
        }
        
        executeSearch(state.inputElement.value);
    }

    /**
     * Обработчик загрузки каталога
     */
    function handleCatalogLoaded() {
        // Если был активный поиск — повторяем его
        if (state.query && state.query.length >= CONFIG.minQueryLength) {
            executeSearch(state.query);
        }
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — UI
    // ============================================

    /**
     * Обновить состояние поля ввода
     */
    function updateInputState() {
        if (!state.inputElement) return;

        const container = state.inputElement.closest('.search-box') || 
                          state.inputElement.parentElement;

        if (!container) return;

        // Управляем классами
        container.classList.toggle(CLASSES.loading, state.isSearching);
        container.classList.toggle(CLASSES.active, state.query.length > 0);
        container.classList.toggle(CLASSES.hasResults, state.results.length > 0);
        container.classList.toggle(CLASSES.empty, 
            state.query.length >= CONFIG.minQueryLength && state.results.length === 0
        );
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — СОБЫТИЯ
    // ============================================

    /**
     * Эмитить событие изменения поиска
     * @param {Array|null} results
     */
    function emitSearchChange(results) {
        if (!window.CatalogEventBus) return;

        // Событие search:change
        window.CatalogEventBus.emit('search:change', {
            query: state.query,
            results: results,
            count: results ? results.length : null,
            timestamp: Date.now()
        });

        // Если есть результаты — эмитим catalog:filtered для интеграции с каталогом
        if (results !== null) {
            window.CatalogEventBus.emit('catalog:filtered', {
                source: 'search',
                products: results,
                query: state.query,
                count: results.length
            });
        }
    }

    // ============================================
    // ПУБЛИЧНЫЙ API
    // ============================================

    /**
     * Инициализация модуля
     * @param {Object} options - Опции инициализации
     * @returns {boolean}
     */
    function init(options = {}) {
        if (state.initialized) {
            console.warn('[SearchController] Уже инициализирован');
            return true;
        }

        // Находим элементы
        const inputSelector = options.inputSelector || SELECTORS.input;
        state.inputElement = document.querySelector(inputSelector);

        if (!state.inputElement) {
            console.error('[SearchController] Поле поиска не найдено:', inputSelector);
            return false;
        }

        // Привязываем обработчики
        state.inputElement.addEventListener('input', handleInput);
        
        // Phase 5C-4: Named handler for keydown (stored for removal)
        handleKeydownRef = function(e) {
            if (e.key === 'Escape') {
                handleClear(e);
            }
        };
        state.inputElement.addEventListener('keydown', handleKeydownRef);

        // Кнопка очистки
        // Phase 5C-4: Store reference for cleanup
        clearButtonElement = document.querySelector(SELECTORS.clearButton);
        if (clearButtonElement) {
            handleClearRef = handleClear;
            clearButtonElement.addEventListener('click', handleClearRef);
        }

        // Форма поиска
        // Phase 5C-4: Store reference for cleanup
        formElement = state.inputElement.closest('form') || 
                     document.querySelector(SELECTORS.form);
        if (formElement) {
            handleSubmitRef = handleSubmit;
            formElement.addEventListener('submit', handleSubmitRef);
        }

        // Подписываемся на события
        // Phase 5C-4: Guard against duplicate subscriptions
        if (window.CatalogEventBus && !state.eventsBound) {
            // Сохраняем возвращаемую функцию отписки если она доступна
            try {
                var unsub = window.CatalogEventBus.on('catalog:loaded', handleCatalogLoaded);
                if (typeof unsub === 'function') {
                    state.catalogLoadedUnsub = unsub;
                }
            } catch (e) {
                // Fallback: если on() не возвращает unsub, keep using off() in destroy
                window.CatalogEventBus.on('catalog:loaded', handleCatalogLoaded);
            }
            state.eventsBound = true;
        }

        // Применяем конфигурацию
        if (options.debounceDelay) {
            CONFIG.debounceDelay = options.debounceDelay;
        }
        if (options.minQueryLength) {
            CONFIG.minQueryLength = options.minQueryLength;
        }
        if (options.maxResults) {
            CONFIG.maxResults = options.maxResults;
        }

        state.initialized = true;
        console.log('[SearchController] Инициализирован');
        
        return true;
    }

    /**
     * Уничтожение модуля
     */
    function destroy() {
        if (!state.initialized) return;

        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
        }

        if (state.inputElement) {
            state.inputElement.removeEventListener('input', handleInput);
            
            // Phase 5C-4: Remove keydown listener
            if (handleKeydownRef) {
                state.inputElement.removeEventListener('keydown', handleKeydownRef);
                handleKeydownRef = null;
            }
        }

        // Phase 5C-4: Remove clear button listener
        if (clearButtonElement && handleClearRef) {
            clearButtonElement.removeEventListener('click', handleClearRef);
            clearButtonElement = null;
            handleClearRef = null;
        }

        // Phase 5C-4: Remove form listener
        if (formElement && handleSubmitRef) {
            formElement.removeEventListener('submit', handleSubmitRef);
            formElement = null;
            handleSubmitRef = null;
        }

        // Phase 5C-4: Unsubscribe from EventBus
        if (window.CatalogEventBus) {
            if (state.catalogLoadedUnsub && typeof state.catalogLoadedUnsub === 'function') {
                try { state.catalogLoadedUnsub(); } catch (e) {}
                state.catalogLoadedUnsub = null;
            } else if (typeof window.CatalogEventBus.off === 'function') {
                window.CatalogEventBus.off('catalog:loaded', handleCatalogLoaded);
            }
        }
        state.eventsBound = false; // Phase 5C-4: Reset flag

        state.query = '';
        state.results = [];
        state.inputElement = null;
        state.resultsElement = null;
        state.initialized = false;

        console.log('[SearchController] Уничтожен');
    }

    /**
     * Программный поиск
     * @param {string} query
     * @returns {Array}
     */
    function search(query) {
        state.query = query;
        
        if (state.inputElement) {
            state.inputElement.value = query;
        }
        
        const results = performSearch(query);
        state.results = results;
        
        emitSearchChange(results);
        updateInputState();
        
        return results;
    }

    /**
     * Сбросить поиск
     */
    function reset() {
        state.query = '';
        state.results = [];
        
        if (state.inputElement) {
            state.inputElement.value = '';
        }
        
        emitSearchChange(null);
        updateInputState();
    }

    /**
     * Получить текущий запрос
     * @returns {string}
     */
    function getQuery() {
        return state.query;
    }

    /**
     * Получить результаты поиска
     * @returns {Array}
     */
    function getResults() {
        return [...state.results];
    }

    /**
     * Проверить, активен ли поиск
     * @returns {boolean}
     */
    function isActive() {
        return state.query.length >= CONFIG.minQueryLength;
    }

    // ============================================
    // ЭКСПОРТ
    // ============================================

    return {
        init,
        destroy,
        search,
        reset,
        getQuery,
        getResults,
        isActive
    };

})();

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchController;
}

// Глобальный экспорт
window.SearchController = SearchController;


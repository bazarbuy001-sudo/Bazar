/**
 * paginationFix.js
 * Исправление логики пагинации
 * 
 * ПРОБЛЕМА (из CATALOG_AUDIT_REPORT.md):
 * Метод applyPagination() использует slice(0, currentPage * pageSize),
 * что означает "показать все товары до текущей страницы",
 * а не "показать товары только текущей страницы".
 * 
 * РЕШЕНИЕ:
 * Этот модуль патчит существующий CatalogPagination,
 * исправляя метод applyPagination() на корректную логику.
 * 
 * ЗАВИСИМОСТИ:
 * - CatalogPagination (frontend/js/catalog/pagination.js)
 * 
 * ПРИМЕНЕНИЕ:
 * Подключить ПОСЛЕ pagination.js, ПЕРЕД использованием каталога.
 * 
 * @version 1.0.0
 * @author Claude (по ТЗ BazarBuy)
 */

(function() {
    'use strict';

    // ============================================
    // ПРОВЕРКА ЗАВИСИМОСТЕЙ
    // ============================================

    /**
     * Ждать появления CatalogPagination
     * @param {Function} callback
     * @param {number} maxAttempts
     */
    function waitForPagination(callback, maxAttempts = 50) {
        let attempts = 0;
        
        const check = function() {
            attempts++;
            
            if (window.CatalogPagination) {
                callback(window.CatalogPagination);
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('[PaginationFix] CatalogPagination не найден после', maxAttempts, 'попыток');
            }
        };
        
        check();
    }

    // ============================================
    // ПАТЧ ПАГИНАЦИИ
    // ============================================

    /**
     * Применить патч к CatalogPagination
     * @param {Object} pagination - Модуль CatalogPagination
     */
    function applyPatch(pagination) {
        // Сохраняем оригинальный метод
        const originalApplyPagination = pagination.applyPagination;
        
        if (!originalApplyPagination) {
            console.error('[PaginationFix] Метод applyPagination не найден');
            return;
        }

        /**
         * Исправленный метод applyPagination
         * Показывает ТОЛЬКО товары текущей страницы
         * 
         * @param {Array} products - Массив товаров
         * @returns {Array} - Товары текущей страницы
         */
        pagination.applyPagination = function(products) {
            if (!products || !Array.isArray(products)) {
                return [];
            }

            // Получаем параметры пагинации
            const currentPage = pagination.getCurrentPage ? pagination.getCurrentPage() : 1;
            const pageSize = pagination.getPageSize ? pagination.getPageSize() : 24;

            // ИСПРАВЛЕНИЕ: Вычисляем индексы для ТЕКУЩЕЙ страницы
            // Было: slice(0, currentPage * pageSize) — все товары до текущей страницы
            // Стало: slice(start, end) — только товары текущей страницы
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;

            return products.slice(startIndex, endIndex);
        };

        console.log('[PaginationFix] Метод applyPagination исправлен');

        // ============================================
        // ДОПОЛНИТЕЛЬНЫЕ УЛУЧШЕНИЯ
        // ============================================

        /**
         * Добавляем метод для получения общего количества страниц
         * @param {number} totalItems - Общее количество товаров
         * @returns {number}
         */
        if (!pagination.getTotalPages) {
            pagination.getTotalPages = function(totalItems) {
                const pageSize = pagination.getPageSize ? pagination.getPageSize() : 24;
                return Math.ceil(totalItems / pageSize);
            };
            console.log('[PaginationFix] Добавлен метод getTotalPages');
        }

        /**
         * Добавляем метод для перехода на конкретную страницу
         * @param {number} page - Номер страницы
         * @param {number} totalItems - Общее количество товаров
         * @returns {boolean} - Успешность перехода
         */
        if (!pagination.goToPage) {
            pagination.goToPage = function(page, totalItems) {
                const totalPages = pagination.getTotalPages(totalItems);
                
                if (page < 1 || page > totalPages) {
                    return false;
                }

                // Внутреннее состояние пагинации
                // КОММЕНТАРИЙ: Зависит от реализации CatalogPagination
                // Если есть setCurrentPage — используем его
                if (pagination.setCurrentPage) {
                    pagination.setCurrentPage(page);
                } else if (pagination._state) {
                    pagination._state.currentPage = page;
                } else {
                    // Fallback: пытаемся установить через reset + nextPage
                    pagination.reset();
                    for (let i = 1; i < page; i++) {
                        pagination.nextPage();
                    }
                }

                return true;
            };
            console.log('[PaginationFix] Добавлен метод goToPage');
        }

        /**
         * Добавляем метод для перехода на предыдущую страницу
         * @returns {boolean}
         */
        if (!pagination.prevPage) {
            pagination.prevPage = function() {
                const currentPage = pagination.getCurrentPage ? pagination.getCurrentPage() : 1;
                
                if (currentPage <= 1) {
                    return false;
                }

                if (pagination.setCurrentPage) {
                    pagination.setCurrentPage(currentPage - 1);
                } else if (pagination._state) {
                    pagination._state.currentPage = currentPage - 1;
                }

                return true;
            };
            console.log('[PaginationFix] Добавлен метод prevPage');
        }

        /**
         * Добавляем метод для проверки наличия следующей страницы
         * @param {number} totalItems
         * @returns {boolean}
         */
        if (!pagination.hasNextPage) {
            pagination.hasNextPage = function(totalItems) {
                const currentPage = pagination.getCurrentPage ? pagination.getCurrentPage() : 1;
                const totalPages = pagination.getTotalPages(totalItems);
                return currentPage < totalPages;
            };
            console.log('[PaginationFix] Добавлен метод hasNextPage');
        }

        /**
         * Добавляем метод для проверки наличия предыдущей страницы
         * @returns {boolean}
         */
        if (!pagination.hasPrevPage) {
            pagination.hasPrevPage = function() {
                const currentPage = pagination.getCurrentPage ? pagination.getCurrentPage() : 1;
                return currentPage > 1;
            };
            console.log('[PaginationFix] Добавлен метод hasPrevPage');
        }

        /**
         * Добавляем метод для получения информации о пагинации
         * @param {number} totalItems
         * @returns {Object}
         */
        if (!pagination.getInfo) {
            pagination.getInfo = function(totalItems) {
                const currentPage = pagination.getCurrentPage ? pagination.getCurrentPage() : 1;
                const pageSize = pagination.getPageSize ? pagination.getPageSize() : 24;
                const totalPages = pagination.getTotalPages(totalItems);
                
                const startItem = (currentPage - 1) * pageSize + 1;
                const endItem = Math.min(currentPage * pageSize, totalItems);

                return {
                    currentPage,
                    pageSize,
                    totalPages,
                    totalItems,
                    startItem,
                    endItem,
                    hasNext: currentPage < totalPages,
                    hasPrev: currentPage > 1
                };
            };
            console.log('[PaginationFix] Добавлен метод getInfo');
        }

        // Отмечаем, что патч применён
        pagination._patchApplied = true;
    }

    // ============================================
    // АЛЬТЕРНАТИВНАЯ РЕАЛИЗАЦИЯ
    // ============================================

    /**
     * Если CatalogPagination не существует — создаём минимальную реализацию
     * КОММЕНТАРИЙ: Это fallback, по ТЗ модуль должен существовать
     */
    function createFallbackPagination() {
        const state = {
            currentPage: 1,
            pageSize: 24
        };

        return {
            init: function(options = {}) {
                state.pageSize = options.pageSize || 24;
                state.currentPage = 1;
            },

            applyPagination: function(products) {
                if (!products || !Array.isArray(products)) {
                    return [];
                }
                const start = (state.currentPage - 1) * state.pageSize;
                const end = start + state.pageSize;
                return products.slice(start, end);
            },

            nextPage: function() {
                state.currentPage++;
                return state.currentPage;
            },

            prevPage: function() {
                if (state.currentPage > 1) {
                    state.currentPage--;
                }
                return state.currentPage;
            },

            reset: function() {
                state.currentPage = 1;
            },

            getCurrentPage: function() {
                return state.currentPage;
            },

            setCurrentPage: function(page) {
                state.currentPage = page;
            },

            getPageSize: function() {
                return state.pageSize;
            },

            setPageSize: function(size) {
                state.pageSize = size;
                state.currentPage = 1;
            },

            getTotalPages: function(totalItems) {
                return Math.ceil(totalItems / state.pageSize);
            },

            goToPage: function(page, totalItems) {
                const totalPages = this.getTotalPages(totalItems);
                if (page >= 1 && page <= totalPages) {
                    state.currentPage = page;
                    return true;
                }
                return false;
            },

            hasNextPage: function(totalItems) {
                return state.currentPage < this.getTotalPages(totalItems);
            },

            hasPrevPage: function() {
                return state.currentPage > 1;
            },

            getInfo: function(totalItems) {
                const totalPages = this.getTotalPages(totalItems);
                const startItem = (state.currentPage - 1) * state.pageSize + 1;
                const endItem = Math.min(state.currentPage * state.pageSize, totalItems);

                return {
                    currentPage: state.currentPage,
                    pageSize: state.pageSize,
                    totalPages,
                    totalItems,
                    startItem,
                    endItem,
                    hasNext: state.currentPage < totalPages,
                    hasPrev: state.currentPage > 1
                };
            },

            _patchApplied: true,
            _isFallback: true
        };
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================

    /**
     * Главная функция инициализации
     */
    function initialize() {
        waitForPagination(function(pagination) {
            // Проверяем, не применён ли уже патч
            if (pagination._patchApplied) {
                console.log('[PaginationFix] Патч уже применён');
                return;
            }

            applyPatch(pagination);
        });
    }

    // Запускаем инициализацию
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // ============================================
    // ЭКСПОРТ FALLBACK (если нужен)
    // ============================================

    window.PaginationFix = {
        applyPatch: applyPatch,
        createFallback: createFallbackPagination,
        
        /**
         * Принудительно применить патч
         */
        forceApply: function() {
            if (window.CatalogPagination) {
                applyPatch(window.CatalogPagination);
            } else {
                console.warn('[PaginationFix] CatalogPagination не найден, создаём fallback');
                window.CatalogPagination = createFallbackPagination();
            }
        }
    };

})();


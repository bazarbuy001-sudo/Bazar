/**
 * dataStoreNavigation.js
 * Расширение CatalogDataStore методом getNavigation()
 * 
 * НАЗНАЧЕНИЕ:
 * MegaMenu и SEO требуют данные навигации (category → subcategory → fabricType).
 * Этот модуль добавляет метод getNavigation() в существующий DataStore.
 * 
 * ИСТОЧНИК ДАННЫХ:
 * - Таблица navigation_menu (через WordPressRESTSource или LocalJSONSource)
 * - НЕ строится из products (хотя fallback есть)
 * 
 * ЗАВИСИМОСТИ:
 * - CatalogDataStore (frontend/js/catalog/dataStore.js)
 * 
 * ПРИМЕНЕНИЕ:
 * Подключить ПОСЛЕ dataStore.js
 * 
 * @version 1.0.0
 * @author Claude (по ТЗ BazarBuy)
 */

(function() {
    'use strict';

    // ============================================
    // ОЖИДАНИЕ DATASTORE
    // ============================================

    function waitForDataStore(callback, maxAttempts = 50) {
        let attempts = 0;
        
        const check = function() {
            attempts++;
            
            if (window.CatalogDataStore) {
                callback(window.CatalogDataStore);
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('[DataStoreNavigation] CatalogDataStore не найден');
            }
        };
        
        check();
    }

    // ============================================
    // РАСШИРЕНИЕ DATASTORE
    // ============================================

    function extendDataStore(dataStore) {
        // Проверяем, не добавлен ли уже метод
        if (typeof dataStore.getNavigation === 'function') {
            console.log('[DataStoreNavigation] Метод getNavigation уже существует');
            return;
        }

        // Кэш навигации
        let navigationCache = null;

        /**
         * Получить данные навигации
         * @returns {Array} Массив записей навигации
         * 
         * Формат записи (из VARIANT_B_DATA_SPEC.md):
         * {
         *   category_id: string,
         *   category_name: string,
         *   subcategory_id: string,
         *   subcategory_name: string,
         *   fabric_type_id: string,
         *   fabric_type_name: string,
         *   order: number
         * }
         */
        dataStore.getNavigation = function() {
            // Возвращаем кэш, если есть
            if (navigationCache !== null) {
                return navigationCache;
            }

            // Пытаемся получить из источника данных
            const source = dataStore._dataSource || dataStore.dataSource;
            
            if (source && typeof source.getNavigation === 'function') {
                navigationCache = source.getNavigation();
                return navigationCache;
            }

            // Fallback: строим из products
            // КОММЕНТАРИЙ: По ТЗ это НЕ рекомендуется, навигация должна
            // приходить отдельно от products
            console.warn('[DataStoreNavigation] Навигация не найдена в источнике, строим из products');
            navigationCache = buildNavigationFromProducts();
            return navigationCache;
        };

        /**
         * Очистить кэш навигации (при обновлении данных)
         */
        dataStore.clearNavigationCache = function() {
            navigationCache = null;
        };

        /**
         * Установить навигацию напрямую
         * @param {Array} navigation
         */
        dataStore.setNavigation = function(navigation) {
            if (Array.isArray(navigation)) {
                navigationCache = navigation;
            }
        };

        /**
         * Построить навигацию из products (fallback)
         * @returns {Array}
         */
        function buildNavigationFromProducts() {
            const products = dataStore.getAllProducts();
            
            if (!products || products.length === 0) {
                return [];
            }

            const navMap = new Map();

            products.forEach(product => {
                // Пропускаем неактивные товары
                if (product.is_active === false) return;
                
                // Пропускаем товары без обязательных полей навигации
                if (!product.category_id || !product.subcategory_id || !product.fabric_type_id) {
                    return;
                }

                const key = `${product.category_id}|${product.subcategory_id}|${product.fabric_type_id}`;
                
                if (!navMap.has(key)) {
                    navMap.set(key, {
                        category_id: product.category_id,
                        category_name: product.category_name || product.category_id,
                        subcategory_id: product.subcategory_id,
                        subcategory_name: product.subcategory_name || product.subcategory_id,
                        fabric_type_id: product.fabric_type_id,
                        fabric_type_name: product.fabric_type_name || product.fabric_type_id,
                        order: 0
                    });
                }
            });

            return Array.from(navMap.values());
        }

        // Подписываемся на событие загрузки данных для сброса кэша
        if (window.CatalogEventBus) {
            window.CatalogEventBus.on('catalog:loaded', function() {
                navigationCache = null;
            });
        }

        console.log('[DataStoreNavigation] Метод getNavigation добавлен');
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            waitForDataStore(extendDataStore);
        });
    } else {
        waitForDataStore(extendDataStore);
    }

})();


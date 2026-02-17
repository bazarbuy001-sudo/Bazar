/**
 * seoController.js
 * Модуль SEO для каталога
 * 
 * ЗАВИСИМОСТИ:
 * - CatalogEventBus (frontend/js/catalog/eventBus.js)
 * 
 * ИНДЕКСИРУЕМЫЕ СТРАНИЦЫ (ТОЛЬКО):
 * - /catalog
 * - /catalog/{category}
 * - /catalog/{category}/{subcategory}
 * - /catalog/{category}/{subcategory}/{fabric-type}
 * 
 * НЕИНДЕКСИРУЕМЫЕ (noindex,follow):
 * - Поиск
 * - Фильтры
 * - Сортировка
 * - Любые URL с параметрами
 * - Popup товара (БЕЗ URL)
 * 
 * СОБЫТИЯ:
 * - Слушает: catalog:filtered, search:change
 * 
 * @version 1.0.0
 * @author Claude (по ТЗ BazarBuy)
 */

const SEOController = (function() {
    'use strict';

    // ============================================
    // СОСТОЯНИЕ
    // ============================================

    const state = {
        currentPath: '',
        hasActiveFilters: false,
        hasActiveSearch: false,
        currentLang: 'ru',
        initialized: false
    };

    // ============================================
    // КОНФИГУРАЦИЯ
    // ============================================

    const CONFIG = {
        siteName: 'BazarBuy',
        baseUrl: '', // Будет определён при инициализации
        defaultLang: 'ru',
        supportedLangs: ['ru', 'en']
    };

    // ============================================
    // ШАБЛОНЫ META-ТЕГОВ (из CATALOG_SEO_DEV_SPEC.md)
    // ============================================

    const META_TEMPLATES = {
        ru: {
            catalog: {
                title: 'Каталог тканей оптом — BazarBuy',
                description: 'Каталог тканей оптом. Большой выбор тканей для любых нужд. Работаем с B2B. BazarBuy.'
            },
            category: {
                title: '{name} ткани оптом — купить | BazarBuy',
                description: '{name} ткани оптом. Большой выбор, разные плотности и цвета. Работаем с B2B. BazarBuy.'
            },
            subcategory: {
                title: '{name} ткани — каталог | BazarBuy',
                description: 'Каталог тканей {name}. Все виды, характеристики и наличие. BazarBuy.'
            },
            fabricType: {
                title: '{name} — ткани оптом | BazarBuy',
                description: '{name} — ткани оптом от BazarBuy. Выбор цветов и плотностей. B2B.'
            }
        },
        en: {
            catalog: {
                title: 'Wholesale Fabric Catalog — BazarBuy',
                description: 'Wholesale fabric catalog. Wide selection of fabrics for any need. B2B. BazarBuy.'
            },
            category: {
                title: '{name} fabrics wholesale | BazarBuy',
                description: '{name} fabrics wholesale. Wide selection, various densities and colors. B2B. BazarBuy.'
            },
            subcategory: {
                title: '{name} fabrics catalog | BazarBuy',
                description: '{name} fabrics catalog. All types, specifications and availability. BazarBuy.'
            },
            fabricType: {
                title: '{name} — wholesale fabrics | BazarBuy',
                description: '{name} — wholesale fabrics from BazarBuy. Selection of colors and densities. B2B.'
            }
        }
    };

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — ПАРСИНГ URL
    // ============================================

    /**
     * Парсить текущий URL каталога
     * @returns {Object}
     */
    function parseCurrentUrl() {
        const path = window.location.pathname;
        const lang = path.startsWith('/en/') ? 'en' : 'ru';
        const cleanPath = path.replace(/^\/(en\/)?/, '');
        const segments = cleanPath.split('/').filter(Boolean);

        // Проверяем, есть ли query-параметры
        const hasParams = window.location.search.length > 0;

        return {
            lang,
            segments,
            hasParams,
            isCatalog: segments[0] === 'catalog',
            category: segments[1] || null,
            subcategory: segments[2] || null,
            fabricType: segments[3] || null
        };
    }

    /**
     * Определить тип страницы
     * @param {Object} urlInfo
     * @returns {string}
     */
    function getPageType(urlInfo) {
        if (!urlInfo.isCatalog) return 'other';
        
        if (urlInfo.fabricType) return 'fabricType';
        if (urlInfo.subcategory) return 'subcategory';
        if (urlInfo.category) return 'category';
        
        return 'catalog';
    }

    /**
     * Определить, нужен ли noindex
     * @param {Object} urlInfo
     * @returns {boolean}
     */
    function shouldNoIndex(urlInfo) {
        // Любые query-параметры = noindex
        if (urlInfo.hasParams) return true;
        
        // Активный поиск = noindex
        if (state.hasActiveSearch) return true;
        
        // Активные фильтры = noindex
        if (state.hasActiveFilters) return true;
        
        // Страница не каталог = не управляем
        if (!urlInfo.isCatalog) return false;
        
        return false;
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — ГЕНЕРАЦИЯ META
    // ============================================

    /**
     * Получить или создать meta-тег
     * @param {string} name - Имя атрибута (name или property)
     * @param {string} value - Значение атрибута
     * @returns {HTMLMetaElement}
     */
    function getOrCreateMeta(name, value) {
        let selector = `meta[name="${name}"]`;
        if (name.startsWith('og:')) {
            selector = `meta[property="${name}"]`;
        }
        
        let meta = document.querySelector(selector);
        
        if (!meta) {
            meta = document.createElement('meta');
            if (name.startsWith('og:')) {
                meta.setAttribute('property', name);
            } else {
                meta.setAttribute('name', name);
            }
            document.head.appendChild(meta);
        }
        
        return meta;
    }

    /**
     * Установить robots meta
     * @param {boolean} noIndex
     */
    function setRobotsMeta(noIndex) {
        const meta = getOrCreateMeta('robots', '');
        meta.setAttribute('content', noIndex ? 'noindex,follow' : 'index,follow');
    }

    /**
     * Установить canonical
     * @param {string} url
     */
    function setCanonical(url) {
        let link = document.querySelector('link[rel="canonical"]');
        
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            document.head.appendChild(link);
        }
        
        link.setAttribute('href', url);
    }

    /**
     * Установить hreflang ссылки
     * @param {string} ruUrl
     * @param {string} enUrl
     */
    function setHreflang(ruUrl, enUrl) {
        // Удаляем существующие
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
        
        // Создаём новые
        const hreflangs = [
            { lang: 'ru', url: ruUrl },
            { lang: 'en', url: enUrl },
            { lang: 'x-default', url: ruUrl }
        ];
        
        hreflangs.forEach(({ lang, url }) => {
            const link = document.createElement('link');
            link.setAttribute('rel', 'alternate');
            link.setAttribute('hreflang', lang);
            link.setAttribute('href', url);
            document.head.appendChild(link);
        });
    }

    /**
     * Установить title
     * @param {string} title
     */
    function setTitle(title) {
        document.title = title;
        
        // OG:title
        const ogTitle = getOrCreateMeta('og:title', '');
        ogTitle.setAttribute('content', title);
    }

    /**
     * Установить description
     * @param {string} description
     */
    function setDescription(description) {
        const meta = getOrCreateMeta('description', '');
        meta.setAttribute('content', description);
        
        // OG:description
        const ogDesc = getOrCreateMeta('og:description', '');
        ogDesc.setAttribute('content', description);
    }

    /**
     * Применить шаблон meta-тегов
     * @param {string} templateKey
     * @param {Object} data
     * @param {string} lang
     */
    function applyMetaTemplate(templateKey, data, lang) {
        const templates = META_TEMPLATES[lang] || META_TEMPLATES.ru;
        const template = templates[templateKey];
        
        if (!template) {
            console.warn('[SEOController] Шаблон не найден:', templateKey);
            return;
        }
        
        let title = template.title;
        let description = template.description;
        
        // Подставляем данные
        if (data.name) {
            title = title.replace('{name}', data.name);
            description = description.replace('{name}', data.name);
        }
        
        setTitle(title);
        setDescription(description);
    }

    /**
     * Генерировать canonical URL (чистый, без параметров)
     * @param {Object} urlInfo
     * @returns {string}
     */
    function generateCanonicalUrl(urlInfo) {
        const baseUrl = CONFIG.baseUrl || window.location.origin;
        const langPrefix = urlInfo.lang === 'en' ? '/en' : '';
        
        let path = '/catalog';
        
        if (urlInfo.category) {
            path += `/${urlInfo.category}`;
        }
        if (urlInfo.subcategory) {
            path += `/${urlInfo.subcategory}`;
        }
        if (urlInfo.fabricType) {
            path += `/${urlInfo.fabricType}`;
        }
        
        return `${baseUrl}${langPrefix}${path}`;
    }

    /**
     * Генерировать alternate URL для другого языка
     * @param {Object} urlInfo
     * @param {string} targetLang
     * @returns {string}
     */
    function generateAlternateUrl(urlInfo, targetLang) {
        const baseUrl = CONFIG.baseUrl || window.location.origin;
        const langPrefix = targetLang === 'en' ? '/en' : '';
        
        let path = '/catalog';
        
        if (urlInfo.category) path += `/${urlInfo.category}`;
        if (urlInfo.subcategory) path += `/${urlInfo.subcategory}`;
        if (urlInfo.fabricType) path += `/${urlInfo.fabricType}`;
        
        return `${baseUrl}${langPrefix}${path}`;
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — BREADCRUMBS
    // ============================================

    /**
     * Генерировать Schema.org BreadcrumbList
     * @param {Object} urlInfo
     * @param {Object} names - Названия категорий/подкатегорий
     * @returns {Object}
     */
    function generateBreadcrumbSchema(urlInfo, names = {}) {
        const baseUrl = CONFIG.baseUrl || window.location.origin;
        const langPrefix = urlInfo.lang === 'en' ? '/en' : '';
        
        const items = [
            {
                '@type': 'ListItem',
                position: 1,
                name: urlInfo.lang === 'en' ? 'Home' : 'Главная',
                item: `${baseUrl}${langPrefix}/`
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: urlInfo.lang === 'en' ? 'Catalog' : 'Каталог',
                item: `${baseUrl}${langPrefix}/catalog`
            }
        ];
        
        let position = 3;
        
        if (urlInfo.category && names.category) {
            items.push({
                '@type': 'ListItem',
                position: position++,
                name: names.category,
                item: `${baseUrl}${langPrefix}/catalog/${urlInfo.category}`
            });
        }
        
        if (urlInfo.subcategory && names.subcategory) {
            items.push({
                '@type': 'ListItem',
                position: position++,
                name: names.subcategory,
                item: `${baseUrl}${langPrefix}/catalog/${urlInfo.category}/${urlInfo.subcategory}`
            });
        }
        
        if (urlInfo.fabricType && names.fabricType) {
            items.push({
                '@type': 'ListItem',
                position: position++,
                name: names.fabricType,
                item: `${baseUrl}${langPrefix}/catalog/${urlInfo.category}/${urlInfo.subcategory}/${urlInfo.fabricType}`
            });
        }
        
        return {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items
        };
    }

    /**
     * Установить JSON-LD schema
     * @param {string} id - Идентификатор скрипта
     * @param {Object} schema
     */
    function setJsonLdSchema(id, schema) {
        // Удаляем существующий
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        
        // Создаём новый
        const script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — ОБРАБОТЧИКИ
    // ============================================

    /**
     * Обработчик изменения фильтров
     * @param {Object} detail
     */
    function handleFilterChange(detail) {
        // Проверяем, есть ли активные фильтры
        const hasFilters = detail && detail.source === 'filters' && 
                          detail.activeFilters && 
                          Object.keys(detail.activeFilters).length > 0;
        
        if (state.hasActiveFilters !== hasFilters) {
            state.hasActiveFilters = hasFilters;
            updateSEO();
        }
    }

    /**
     * Обработчик изменения поиска
     * @param {Object} detail
     */
    function handleSearchChange(detail) {
        const hasSearch = detail && detail.query && detail.query.length >= 2;
        
        if (state.hasActiveSearch !== hasSearch) {
            state.hasActiveSearch = hasSearch;
            updateSEO();
        }
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ — ОБНОВЛЕНИЕ
    // ============================================

    /**
     * Обновить SEO на основе текущего состояния
     */
    function updateSEO() {
        const urlInfo = parseCurrentUrl();
        
        if (!urlInfo.isCatalog) {
            // Не каталог — не управляем
            return;
        }
        
        const pageType = getPageType(urlInfo);
        const noIndex = shouldNoIndex(urlInfo);
        
        // Устанавливаем robots
        setRobotsMeta(noIndex);
        
        // Устанавливаем canonical (всегда чистый URL)
        const canonicalUrl = generateCanonicalUrl(urlInfo);
        setCanonical(canonicalUrl);
        
        // Устанавливаем hreflang
        const ruUrl = generateAlternateUrl(urlInfo, 'ru');
        const enUrl = generateAlternateUrl(urlInfo, 'en');
        setHreflang(ruUrl, enUrl);
        
        // Устанавливаем meta-теги на основе типа страницы
        // КОММЕНТАРИЙ: Для получения названий категорий нужен доступ к DataStore
        // или данным навигации. Пока используем id как fallback.
        const names = getPageNames(urlInfo);
        applyMetaTemplate(pageType, names, urlInfo.lang);
        
        // Устанавливаем breadcrumb schema
        const breadcrumbSchema = generateBreadcrumbSchema(urlInfo, names);
        setJsonLdSchema('seo-breadcrumb-schema', breadcrumbSchema);
    }

    /**
     * Получить названия для текущей страницы
     * КОММЕНТАРИЙ: В идеале нужно получать из DataStore.getNavigation()
     * @param {Object} urlInfo
     * @returns {Object}
     */
    function getPageNames(urlInfo) {
        const names = {
            category: null,
            subcategory: null,
            fabricType: null,
            name: null
        };
        
        // Пытаемся получить из DataStore
        if (window.CatalogDataStore && typeof window.CatalogDataStore.getNavigation === 'function') {
            const navigation = window.CatalogDataStore.getNavigation();
            
            if (navigation && navigation.length > 0) {
                // Ищем соответствующую запись
                const match = navigation.find(item => {
                    if (urlInfo.fabricType) {
                        return item.fabric_type_id === urlInfo.fabricType;
                    }
                    if (urlInfo.subcategory) {
                        return item.subcategory_id === urlInfo.subcategory;
                    }
                    if (urlInfo.category) {
                        return item.category_id === urlInfo.category;
                    }
                    return false;
                });
                
                if (match) {
                    names.category = match.category_name;
                    names.subcategory = match.subcategory_name;
                    names.fabricType = match.fabric_type_name;
                }
            }
        }
        
        // Fallback на id если названия не найдены
        if (urlInfo.fabricType && !names.fabricType) {
            names.fabricType = urlInfo.fabricType;
            names.name = urlInfo.fabricType;
        } else if (urlInfo.subcategory && !names.subcategory) {
            names.subcategory = urlInfo.subcategory;
            names.name = urlInfo.subcategory;
        } else if (urlInfo.category && !names.category) {
            names.category = urlInfo.category;
            names.name = urlInfo.category;
        }
        
        // Устанавливаем name для шаблонов
        names.name = names.fabricType || names.subcategory || names.category;
        
        return names;
    }

    // ============================================
    // ПУБЛИЧНЫЙ API
    // ============================================

    /**
     * Инициализация модуля
     * @param {Object} options
     * @returns {boolean}
     */
    function init(options = {}) {
        if (state.initialized) {
            console.warn('[SEOController] Уже инициализирован');
            return true;
        }

        // Применяем конфигурацию
        if (options.baseUrl) {
            CONFIG.baseUrl = options.baseUrl;
        }
        if (options.siteName) {
            CONFIG.siteName = options.siteName;
        }

        // Определяем текущий язык
        const urlInfo = parseCurrentUrl();
        state.currentLang = urlInfo.lang;
        state.currentPath = window.location.pathname;

        // Подписываемся на события
        if (window.CatalogEventBus) {
            window.CatalogEventBus.on('catalog:filtered', handleFilterChange);
            window.CatalogEventBus.on('search:change', handleSearchChange);
        }

        // Выполняем первоначальное обновление
        updateSEO();

        // Слушаем изменения URL (для SPA)
        window.addEventListener('popstate', () => {
            state.currentPath = window.location.pathname;
            updateSEO();
        });

        state.initialized = true;
        console.log('[SEOController] Инициализирован');
        
        return true;
    }

    /**
     * Уничтожение модуля
     */
    function destroy() {
        if (!state.initialized) return;

        state.initialized = false;
        console.log('[SEOController] Уничтожен');
    }

    /**
     * Принудительное обновление SEO
     */
    function refresh() {
        updateSEO();
    }

    /**
     * Установить состояние фильтров
     * @param {boolean} hasFilters
     */
    function setFiltersActive(hasFilters) {
        if (state.hasActiveFilters !== hasFilters) {
            state.hasActiveFilters = hasFilters;
            updateSEO();
        }
    }

    /**
     * Установить состояние поиска
     * @param {boolean} hasSearch
     */
    function setSearchActive(hasSearch) {
        if (state.hasActiveSearch !== hasSearch) {
            state.hasActiveSearch = hasSearch;
            updateSEO();
        }
    }

    /**
     * Получить текущий статус индексации
     * @returns {Object}
     */
    function getStatus() {
        const urlInfo = parseCurrentUrl();
        return {
            pageType: getPageType(urlInfo),
            isIndexable: !shouldNoIndex(urlInfo),
            hasActiveFilters: state.hasActiveFilters,
            hasActiveSearch: state.hasActiveSearch,
            lang: urlInfo.lang,
            canonical: generateCanonicalUrl(urlInfo)
        };
    }

    // ============================================
    // ЭКСПОРТ
    // ============================================

    return {
        init,
        destroy,
        refresh,
        setFiltersActive,
        setSearchActive,
        getStatus
    };

})();

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEOController;
}

// Глобальный экспорт
window.SEOController = SEOController;


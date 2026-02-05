/**
 * megaMenu.js
 * Модуль Mega Menu (каталог-навигация) - Star-Tex Style
 * 
 * АРХИТЕКТУРА:
 * - Двухколоночная структура (разделы слева, весь контент справа)
 * - При hover на раздел → мгновенное отображение ВСЕЙ структуры раздела
 * - Никаких пошаговых раскрытий или третьих колонок
 * 
 * ИСТОЧНИК ДАННЫХ:
 * - catalog_taxonomy_full_generated.json
 * 
 * СТРУКТУРА ДАННЫХ:
 * Раздел → Тип → Подтипы[]
 * 
 * @version 3.0.0 - Complete Star-Tex Rewrite
 * @author Claude (BazarBuy)
 */

const MegaMenu = (function () {
    'use strict';

    // ============================================
    // СОСТОЯНИЕ
    // ============================================

    const state = {
        taxonomy: null,           // Данные из JSON
        isOpen: false,
        activeSection: null,      // Текущий активный раздел
        initialized: false,
        containerElement: null
    };

    // ============================================
    // СЕЛЕКТОРЫ И КЛАССЫ
    // ============================================

    const SELECTORS = {
        container: '.mega-menu',
        catalogBtn: '[data-catalog-btn]',
        overlay: '.mega-menu__overlay',
        sectionsCol: '.mega-menu__sections-column',
        contentCol: '.mega-menu__content-column',
        sectionsList: '.mega-menu__sections-list',
        contentArea: '.mega-menu__content-area',
        sectionItem: '.mega-menu__section-item'
    };

    const CLASSES = {
        open: 'is-open',
        active: 'is-active',
        noScroll: 'no-scroll'
    };

    // ============================================
    // ЗАГРУЗКА ДАННЫХ
    // ============================================

    /**
     * Загрузка taxonomy из JSON файла
     */
    async function loadTaxonomyFromJSON() {
        try {
            const response = await fetch('/frontend/js/catalog/catalog_taxonomy_full_generated.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('[MegaMenu] Taxonomy загружена из JSON:', data);
            return data;
        } catch (error) {
            console.error('[MegaMenu] Ошибка загрузки taxonomy:', error);
            return null;
        }
    }

    /**
     * Синхронная попытка получить taxonomy из window
     */
    function getTaxonomyFromWindow() {
        if (window.CATALOG_TAXONOMY) {
            console.log('[MegaMenu] Используем window.CATALOG_TAXONOMY');
            return window.CATALOG_TAXONOMY;
        }
        return null;
    }

    // ============================================
    // СОЗДАНИЕ HTML СТРУКТУРЫ
    // ============================================

    /**
     * Создание базовой HTML структуры меню
     */
    function createMenuHTML() {
        return `
            <div class="mega-menu__overlay"></div>
            <div class="mega-menu__inner">
                <div class="mega-menu__sections-column">
                    <div class="mega-menu__sections-list"></div>
                </div>
                <div class="mega-menu__content-column">
                    <div class="mega-menu__content-area"></div>
                </div>
            </div>
        `;
    }

    // ============================================
    // РЕНДЕРИНГ РАЗДЕЛОВ
    // ============================================

    /**
     * Отрисовка списка разделов (левая колонка)
     */
    function renderSections() {
        console.log('[MegaMenu] renderSections вызвана');

        const sectionsList = state.containerElement.querySelector(SELECTORS.sectionsList);

        if (!sectionsList) {
            console.error('[MegaMenu] Sections list не найден');
            return;
        }

        if (!state.taxonomy || !state.taxonomy.children) {
            console.error('[MegaMenu] Taxonomy не загружена');
            sectionsList.innerHTML = '<div class="mega-menu__error">Данные каталога недоступны</div>';
            return;
        }

        const sections = state.taxonomy.children;
        console.log('[MegaMenu] Найдено разделов для рендеринга:', sections.length);

        const sectionsHTML = sections.map((section, index) => {
            const isActive = index === 0 || section.slug === state.activeSection;
            return `
                <div class="mega-menu__section-item ${isActive ? CLASSES.active : ''}" 
                     data-section="${escapeHtml(section.slug)}">
                    ${escapeHtml(section.title)}
                </div>
            `;
        }).join('');

        sectionsList.innerHTML = sectionsHTML;

        // Сохраняем ссылку на отрисованный элемент
        state.sectionsElement = sectionsList;
        console.log('[MegaMenu] Разделы отрисованы, sectionsElement установлен');

        // Привязываем события hover
        bindSectionHoverEvents();

        // Отображаем первый раздел по умолчанию
        if (!state.activeSection && sections.length > 0) {
            state.activeSection = sections[0].slug;
            renderSectionContent(sections[0].slug);
        }
    }

    /**
     * Привязка событий hover к разделам
     */
    function bindSectionHoverEvents() {
        const sectionItems = state.containerElement.querySelectorAll(SELECTORS.sectionItem);

        sectionItems.forEach(item => {
            // Используем mouseenter для более быстрого отклика
            item.addEventListener('mouseenter', (e) => {
                const sectionSlug = e.currentTarget.getAttribute('data-section');

                // Убираем активный класс со всех
                sectionItems.forEach(el => el.classList.remove(CLASSES.active));

                // Добавляем активный класс текущему
                e.currentTarget.classList.add(CLASSES.active);

                // Обновляем состояние и контент
                state.activeSection = sectionSlug;
                renderSectionContent(sectionSlug);
            });
        });
    }

    // ============================================
    // РЕНДЕРИНГ КОНТЕНТА РАЗДЕЛА
    // ============================================

    /**
     * Отрисовка ВСЕГО контента выбранного раздела (правая область)
     * Показывает ВСЕ типы и их подтипы одновременно
     */
    function renderSectionContent(sectionSlug) {
        const contentArea = state.containerElement.querySelector(SELECTORS.contentArea);

        if (!contentArea) {
            console.error('[MegaMenu] Content area не найден');
            return;
        }

        if (!state.taxonomy || !state.taxonomy.children) {
            contentArea.innerHTML = '<div class="mega-menu__error">Данные недоступны</div>';
            return;
        }

        // Находим раздел
        const section = state.taxonomy.children.find(s => s.slug === sectionSlug);

        if (!section) {
            contentArea.innerHTML = '<div class="mega-menu__error">Раздел не найден</div>';
            return;
        }

        if (!section.children || section.children.length === 0) {
            contentArea.innerHTML = '<div class="mega-menu__empty">В этом разделе пока нет категорий</div>';
            return;
        }

        // Генерируем HTML для всех типов и подтипов
        const contentHTML = section.children.map(type => {
            return renderTypeBlock(type);
        }).join('');

        contentArea.innerHTML = `<div class="mega-menu__content-grid">${contentHTML}</div>`;

        // Привязываем события клика к ссылкам
        bindContentLinks();
    }

    /**
     * Рендеринг блока одного типа ткани с его подтипами
     */
    function renderTypeBlock(type) {
        const hasSubtypes = type.children && type.children.length > 0;

        let subtypesHTML = '';
        if (hasSubtypes) {
            subtypesHTML = type.children.map(subtype => {
                return `
                    <li class="mega-menu__subtype-item">
                        <a href="/catalog/${type.slug}/${subtype.slug}" 
                           data-type="${escapeHtml(type.slug)}"
                           data-subtype="${escapeHtml(subtype.slug)}">
                            ${escapeHtml(subtype.title)}
                        </a>
                    </li>
                `;
            }).join('');
        }

        return `
            <div class="mega-menu__type-block">
                <div class="mega-menu__type-title">
                    <a href="/catalog/${type.slug}" data-type="${escapeHtml(type.slug)}">
                        ${escapeHtml(type.title)}
                    </a>
                </div>
                ${hasSubtypes ? `<ul class="mega-menu__subtypes-list">${subtypesHTML}</ul>` : ''}
            </div>
        `;
    }

    /**
     * Привязка событий клика к ссылкам в контенте
     */
    function bindContentLinks() {
        const links = state.containerElement.querySelectorAll('.mega-menu__content-area a');

        links.forEach(link => {
            link.addEventListener('click', () => {
                // Здесь можно добавить логику навигации через EventBus
                // Например: CatalogEventBus.emit('catalog:navigate', {...})

                // Закрываем меню после клика
                closeMenu();
            });
        });
    }

    // ============================================
    // УПРАВЛЕНИЕ МЕНЮ
    // ============================================

    /**
     * Открытие меню
     */
    function openMenu() {
        console.log('[MegaMenu] openMenu вызвана, состояние:', {
            isOpen: state.isOpen,
            initialized: state.initialized,
            containerExists: !!state.containerElement,
            sectionsRendered: !!state.sectionsElement
        });

        if (state.isOpen) {
            console.log('[MegaMenu] Меню уже открыто, пропускаем');
            return;
        }

        // ВАЖНО: Компенсируем ширину скроллбара ПЕРЕД добавлением overflow:hidden
        // Это предотвращает сдвиг контента вправо
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }

        // Открываем меню мгновенно
        state.containerElement.classList.add(CLASSES.open);
        document.body.classList.add(CLASSES.noScroll);
        state.isOpen = true;

        console.log('[MegaMenu] Меню открыто');
    }

    /**
     * Закрытие меню
     */
    function closeMenu() {
        if (!state.isOpen) return;

        state.containerElement.classList.remove(CLASSES.open);
        document.body.classList.remove(CLASSES.noScroll);
        state.isOpen = false;

        // Убираем компенсацию скроллбара
        document.body.style.paddingRight = '';

        console.log('[MegaMenu] Меню закрыто');
    }

    /**
     * Переключение состояния меню
     */
    function toggleMenu() {
        if (state.isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    // ============================================
    // ПРИВЯЗКА СОБЫТИЙ
    // ============================================

    /**
     * Привязка событий UI
     */
    function bindUIEvents() {
        // ВАЖНО: НЕ добавляем обработчик на кнопку каталога здесь!
        // Кнопкой управляет CatalogButton модуль, который вызывает MegaMenu.open()/close()
        // Добавление обработчика здесь приведет к двойному срабатыванию

        // Overlay (клик вне меню)
        const overlay = state.containerElement.querySelector(SELECTORS.overlay);
        if (overlay) {
            overlay.addEventListener('click', () => {
                closeMenu();
            });
        }

        // ESC для закрытия
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) {
                closeMenu();
            }
        });

        console.log('[MegaMenu] UI события привязаны');
    }

    /**
     * Подписка на события EventBus (опционально)
     */
    function bindEventBusEvents() {
        if (!window.CatalogEventBus) return;

        window.CatalogEventBus.on('menu:open', () => {
            openMenu();
        });

        window.CatalogEventBus.on('menu:close', () => {
            closeMenu();
        });

        console.log('[MegaMenu] EventBus события привязаны');
    }

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================

    /**
     * Экранирование HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // ПУБЛИЧНЫЙ API
    // ============================================

    /**
     * Инициализация модуля
     */
    async function init(container) {
        if (state.initialized) {
            console.warn('[MegaMenu] Уже инициализирован');
            return true;
        }

        console.log('[MegaMenu] Initializing Star-Tex style menu...');

        // Находим контейнер
        if (typeof container === 'string') {
            state.containerElement = document.querySelector(container);
        } else if (container instanceof HTMLElement) {
            state.containerElement = container;
        } else {
            state.containerElement = document.querySelector(SELECTORS.container);
        }

        if (!state.containerElement) {
            console.error('[MegaMenu] Контейнер не найден');
            return false;
        }

        // Загружаем taxonomy
        state.taxonomy = getTaxonomyFromWindow();

        if (!state.taxonomy) {
            // Асинхронно загружаем из JSON
            state.taxonomy = await loadTaxonomyFromJSON();
        }

        if (!state.taxonomy) {
            console.warn('[MegaMenu] Taxonomy не загружена, продолжаем с пустой структурой');
            state.taxonomy = { children: [] };
        }

        console.log('[MegaMenu] Taxonomy загружена:', {
            sections: state.taxonomy.children ? state.taxonomy.children.length : 0
        });

        // Создаём структуру меню
        const menuHTML = createMenuHTML();
        state.containerElement.innerHTML = menuHTML;

        // Prevent clicks inside .mega-menu__inner from bubbling to overlay
        // BUT allow clicks on overlay itself to close the menu
        const menuInner = state.containerElement.querySelector('.mega-menu__inner');
        if (menuInner) {
            ['click', 'mousedown', 'pointerdown'].forEach(eventName => {
                menuInner.addEventListener(eventName, function (e) {
                    e.stopPropagation();
                }, true);
            });
        }

        // Привязываем события
        bindUIEvents();
        bindEventBusEvents();

        // КРИТИЧЕСКИ ВАЖНО: Рендерим разделы СРАЗУ после инициализации
        // чтобы при первом открытии меню контент был уже готов
        console.log('[MegaMenu] Проверка перед рендерингом:', {
            hasTaxonomy: !!state.taxonomy,
            hasChildren: !!(state.taxonomy && state.taxonomy.children),
            childrenLength: state.taxonomy?.children?.length || 0,
            willRender: !!(state.taxonomy && state.taxonomy.children && state.taxonomy.children.length > 0)
        });

        if (state.taxonomy && state.taxonomy.children && state.taxonomy.children.length > 0) {
            console.log('[MegaMenu] ВЫЗЫВАЕМ renderSections()');
            renderSections();
            console.log('[MegaMenu] Разделы предварительно отрисованы');
        } else {
            console.warn('[MegaMenu] НЕ вызываем renderSections - условие не выполнено');
        }

        state.initialized = true;
        console.log('[MegaMenu] Инициализация завершена, финальное состояние:', {
            initialized: state.initialized,
            taxonomySections: state.taxonomy?.children?.length || 0,
            containerExists: !!state.containerElement,
            publicAPIExists: !!(window.MegaMenu && window.MegaMenu.open)
        });

        return true;
    }

    /**
     * Уничтожение модуля
     */
    function destroy() {
        if (!state.initialized) return;

        // Отписываемся от EventBus
        if (window.CatalogEventBus && typeof window.CatalogEventBus.off === 'function') {
            window.CatalogEventBus.off('menu:open');
            window.CatalogEventBus.off('menu:close');
        }

        if (state.containerElement) {
            state.containerElement.innerHTML = '';
        }

        // Очищаем состояние
        state.taxonomy = null;
        state.isOpen = false;
        state.activeSection = null;
        state.containerElement = null;
        state.initialized = false;

        console.log('[MegaMenu] Уничтожен');
    }

    /**
     * Обновление данных
     */
    async function refresh() {
        state.taxonomy = getTaxonomyFromWindow();

        if (!state.taxonomy) {
            state.taxonomy = await loadTaxonomyFromJSON();
        }

        if (state.isOpen) {
            renderSections();
        }
    }

    /**
     * Получить текущую taxonomy
     */
    function getTaxonomy() {
        return state.taxonomy;
    }

    /**
     * Проверка состояния меню
     */
    function isOpen() {
        return state.isOpen;
    }

    // ============================================
    // ЭКСПОРТ
    // ============================================

    return {
        init,
        destroy,
        refresh,
        open: openMenu,
        close: closeMenu,
        toggle: toggleMenu,
        isOpen,
        getTaxonomy
    };

})();

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MegaMenu;
}

// Глобальный экспорт
window.MegaMenu = MegaMenu;

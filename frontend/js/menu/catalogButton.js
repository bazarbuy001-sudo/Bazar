/**
 * catalogButton.js
 * Модуль кнопки «Каталог товаров»
 * 
 * ЗАВИСИМОСТИ:
 * - CatalogEventBus (frontend/js/catalog/eventBus.js)
 * - MegaMenu (frontend/js/menu/megaMenu.js)
 * 
 * СОБЫТИЯ:
 * - Эмитит: menu:open, menu:close
 * - Слушает: —
 * 
 * @version 1.0.0
 * @author Claude (по ТЗ BazarBuy)
 */

const CatalogButton = (function() {
    'use strict';

    // ============================================
    // СОСТОЯНИЕ
    // ============================================
    
    const state = {
        isOpen: false,
        buttonElement: null,
        menuElement: null,
        initialized: false,
        scrollPosition: 0  // Phase 6: Track scroll position for fallback
    };

    // ============================================
    // СЕЛЕКТОРЫ (КОНФИГУРАЦИЯ)
    // ============================================
    
    const SELECTORS = {
        button: '.catalog-btn',
        menu: '.mega-menu',
        menuContainer: '.mega-menu-container'
    };

    const CLASSES = {
        open: 'is-open',
        active: 'is-active',
        bodyNoScroll: 'no-scroll'
    };

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ============================================

    /**
     * Открыть меню
     */
    function openMenu() {
        if (window.MegaMenu && typeof window.MegaMenu.open === 'function') {
            window.MegaMenu.open();
            // Синхронизируем состояние ПОСЛЕ вызова MegaMenu.open()
            syncStateWithMegaMenu();
        }
    }

    /**
     * Закрыть меню
     */
    function closeMenu() {
        if (window.MegaMenu && typeof window.MegaMenu.close === 'function') {
            window.MegaMenu.close();
            // Синхронизируем состояние ПОСЛЕ вызова MegaMenu.close()
            syncStateWithMegaMenu();
        }
    }

    /**
     * Синхронизация состояния с MegaMenu
     */
    function syncStateWithMegaMenu() {
        if (window.MegaMenu && typeof window.MegaMenu.isOpen === 'function') {
            state.isOpen = window.MegaMenu.isOpen();
            console.log('[CatalogButton] Синхронизирован с MegaMenu, isOpen:', state.isOpen);
        }
    }

    /**
     * Переключить состояние меню
     */
    function toggleMenu() {
        // ВАЖНО: Проверяем реальное состояние MegaMenu, а не локальный state
        const isMenuOpen = window.MegaMenu && typeof window.MegaMenu.isOpen === 'function'
            ? window.MegaMenu.isOpen()
            : state.isOpen;

        console.log('[CatalogButton] toggleMenu, проверка состояния:', {
            localState: state.isOpen,
            megaMenuState: isMenuOpen,
            willClose: isMenuOpen
        });

        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    /**
     * Обработчик клика по кнопке
     * @param {Event} event
     */
    function handleButtonClick(event) {
        console.log('[CatalogButton] Клик по кнопке, текущее состояние:', {
            isOpen: state.isOpen,
            MegaMenuExists: !!window.MegaMenu,
            MegaMenuOpenExists: !!(window.MegaMenu && window.MegaMenu.open)
        });
        event.preventDefault();
        event.stopPropagation();
        toggleMenu();
    }

    /**
     * Обработчик клика вне меню
     * @param {Event} event
     */
    // handleOutsideClick and handleEscKey removed — click/ESC handling centralized in MegaMenu

    /**
     * Валидация наличия элементов DOM
     * @returns {boolean}
     */
    function validateElements() {
        state.buttonElement = document.querySelector(SELECTORS.button);
        state.menuElement = document.querySelector(SELECTORS.menu);

        if (!state.buttonElement) {
            console.error('[CatalogButton] Элемент кнопки не найден:', SELECTORS.button);
            return false;
        }

        if (!state.menuElement) {
            console.error('[CatalogButton] Элемент меню не найден:', SELECTORS.menu);
            return false;
        }

        return true;
    }

    // ============================================
    // ПУБЛИЧНЫЙ API
    // ============================================

    /**
     * Инициализация модуля
     * @returns {boolean} Успешность инициализации
     */
    function init() {
        if (state.initialized) {
            console.warn('[CatalogButton] Уже инициализирован');
            return true;
        }

        if (!validateElements()) {
            return false;
        }

        // Привязываем обработчик к кнопке
        state.buttonElement.addEventListener('click', handleButtonClick);

        // Синхронизируем состояние с MegaMenu
        syncStateWithMegaMenu();

        state.initialized = true;
        console.log('[CatalogButton] Инициализирован');

        return true;
    }

    /**
     * Уничтожение модуля (для тестов / SPA)
     */
    function destroy() {
        if (!state.initialized) return;

        closeMenu();
        
        if (state.buttonElement) {
            state.buttonElement.removeEventListener('click', handleButtonClick);
        }

        state.buttonElement = null;
        state.menuElement = null;
        state.initialized = false;

        console.log('[CatalogButton] Уничтожен');
    }

    /**
     * Получить текущее состояние
     * @returns {boolean}
     */
    function isOpen() {
        return state.isOpen;
    }

    /**
     * Программное открытие меню
     */
    function open() {
        openMenu();
    }

    /**
     * Программное закрытие меню
     */
    function close() {
        closeMenu();
    }

    // ============================================
    // ЭКСПОРТ
    // ============================================

    return {
        init,
        destroy,
        isOpen,
        open,
        close,
        toggle: toggleMenu
    };

})();

// Экспорт для модульных систем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CatalogButton;
}

// Глобальный экспорт
window.CatalogButton = CatalogButton;


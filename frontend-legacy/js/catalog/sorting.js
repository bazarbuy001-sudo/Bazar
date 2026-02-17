/**
 * Sorting - Модуль сортировки каталога
 * Работает поверх фильтров, не сбрасывает их
 */
const CatalogSorting = (function() {
    'use strict';

    // Текущая сортировка
    let _currentSort = {
        key: 'default',
        direction: 'asc'
    };

    // DOM контейнер
    let _container = null;

    // Доступные сортировки
    const SORT_OPTIONS = [
        { key: 'default', label: 'По умолчанию', direction: 'asc' },
        { key: 'price', label: 'По цене ↑', direction: 'asc' },
        { key: 'price', label: 'По цене ↓', direction: 'desc' },
        { key: 'createdAt', label: 'По новизне', direction: 'desc' }
    ];

    /**
     * Инициализация сортировки
     * @param {string} containerId - ID контейнера
     */
    function init(containerId) {
        _container = document.getElementById(containerId);

        if (!_container) {
            console.error(`Catalog: Контейнер сортировки "${containerId}" не найден`);
            return;
        }

        renderSorting();
    }

    /**
     * Рендеринг селекта сортировки
     */
    function renderSorting() {
        if (!_container) return;

        const select = document.createElement('select');
        select.className = 'catalog-sorting__select';
        select.id = 'catalog-sorting-select';

        SORT_OPTIONS.forEach((option, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = option.label;
            select.appendChild(opt);
        });

        select.addEventListener('change', function() {
            const selectedOption = SORT_OPTIONS[this.value];
            _currentSort = {
                key: selectedOption.key,
                direction: selectedOption.direction
            };
            
            // Отправляем событие фильтрации (сортировка не сбрасывает фильтры)
            CatalogEventBus.emit('catalog:filtered', { 
                filters: CatalogFilters.getActiveFilters(),
                sort: _currentSort
            });
        });

        _container.innerHTML = '';
        
        const label = document.createElement('span');
        label.className = 'catalog-sorting__label';
        label.textContent = 'Сортировка:';
        
        _container.appendChild(label);
        _container.appendChild(select);
    }

    /**
     * Получить текущую сортировку
     * @returns {Object}
     */
    function getCurrentSort() {
        return { ..._currentSort };
    }

    /**
     * Применить сортировку к массиву
     * @param {Array} products
     * @returns {Array}
     */
    function applySorting(products) {
        if (_currentSort.key === 'default') {
            return products;
        }

        const sorted = [...products];

        sorted.sort((a, b) => {
            let valueA = CatalogDataStore.getNestedValue(a, _currentSort.key);
            let valueB = CatalogDataStore.getNestedValue(b, _currentSort.key);

            // Обработка цены (учитываем новую цену)
            if (_currentSort.key === 'price') {
                valueA = a.newPrice || a.price || 0;
                valueB = b.newPrice || b.price || 0;
            }

            // Обработка новизны (is_new)
            if (_currentSort.key === 'is_new') {
                valueA = a.is_new || a.isNew || false;
                valueB = b.is_new || b.isNew || false;
                // Булево сравнение: true (новое) должно идти первым при desc
                if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
                    return _currentSort.direction === 'desc' 
                        ? (valueB ? 1 : 0) - (valueA ? 1 : 0)
                        : (valueA ? 1 : 0) - (valueB ? 1 : 0);
                }
            }

            // Обработка дат
            if (_currentSort.key === 'createdAt' || _currentSort.key === 'date') {
                valueA = new Date(valueA || 0).getTime();
                valueB = new Date(valueB || 0).getTime();
            }

            // Числовое сравнение
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return _currentSort.direction === 'asc' 
                    ? valueA - valueB 
                    : valueB - valueA;
            }

            // Строковое сравнение
            valueA = String(valueA || '');
            valueB = String(valueB || '');

            const comparison = valueA.localeCompare(valueB, 'ru');
            return _currentSort.direction === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }

    /**
     * Сброс сортировки
     */
    function reset() {
        _currentSort = { key: 'default', direction: 'asc' };
        
        const select = document.getElementById('catalog-sorting-select');
        if (select) {
            select.value = '0';
        }
    }

    /**
     * Установить сортировку
     * @param {string} key - Ключ сортировки
     * @param {string} direction - Направление (asc/desc)
     */
    function setSort(key, direction) {
        _currentSort = { key: key, direction: direction || 'asc' };
    }

    return {
        init,
        getCurrentSort,
        applySorting,
        reset,
        setSort
    };
})();

// Экспорт для глобального доступа
if (typeof window !== 'undefined') {
    window.CatalogSorting = CatalogSorting;
}

/**
 * Универсальная система автосохранения каждые 10 минут
 * Сохраняет ВСЁ состояние приложения в localStorage
 */

class AutoSave {
  constructor() {
    this.INTERVAL = 10 * 60 * 1000; // 10 минут в миллисекундах
    this.STORAGE_KEY = 'bazar_autosave';
    this.timer = null;
    
    this.init();
  }

  init() {
    // Запуск автосохранения каждые 10 минут
    this.timer = setInterval(() => {
      this.saveEverything();
    }, this.INTERVAL);

    // Сохранение при закрытии страницы
    window.addEventListener('beforeunload', () => {
      this.saveEverything();
    });

    // Восстановление при загрузке
    this.restoreEverything();

    console.log('🔄 Автосохранение запущено: каждые 10 минут');
  }

  async saveEverything() {
    const timestamp = new Date().toISOString();
    const data = {
      timestamp,
      // 1. Корзина
      cart: this.getCartData(),
      
      // 2. Формы (все input/textarea на странице)
      forms: this.getFormData(),
      
      // 3. Состояние интерфейса
      ui: this.getUIState(),
      
      // 4. Фильтры и поиск
      filters: this.getFilters(),
      
      // 5. Открытые попапы/модалки
      popups: this.getPopupState(),
      
      // 6. Позиция скролла
      scroll: this.getScrollPosition(),
      
      // 7. Активная страница/раздел
      page: this.getCurrentPage()
    };

    try {
      // 1. Локальное сохранение (всегда)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      
      // 2. Серверное сохранение (если доступно)
      await this.saveToServer(data);
      
      console.log(`💾 Автосохранение выполнено: ${timestamp}`);
      this.showSaveIndicator();
    } catch (error) {
      console.error('❌ Ошибка автосохранения:', error);
      this.showSaveIndicator('error');
    }
  }

  async saveToServer(data) {
    try {
      const response = await fetch('/api/v1/autosave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Для отправки cookies
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('☁️ Серверное автосохранение успешно');
      } else {
        console.warn('⚠️ Ошибка серверного автосохранения, продолжаем с localStorage');
      }
    } catch (error) {
      // Не критично, если сервер недоступен - localStorage всё равно работает
      console.warn('⚠️ Сервер недоступен, автосохранение только локально');
    }
  }

  async restoreEverything() {
    try {
      let data = null;
      let source = 'localStorage';

      // 1. Пробуем восстановить из localStorage
      const localSaved = localStorage.getItem(this.STORAGE_KEY);
      if (localSaved) {
        data = JSON.parse(localSaved);
        source = 'localStorage';
      }

      // 2. Пробуем восстановить с сервера (если локально нет данных или они устарели)
      if (!data || this.isDataExpired(data)) {
        const serverData = await this.restoreFromServer();
        if (serverData && !this.isDataExpired(serverData)) {
          data = serverData;
          source = 'server';
          // Сохраняем серверные данные локально для быстрого доступа
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        }
      }

      if (!data) {
        console.log('📭 Нет данных для восстановления');
        return;
      }

      if (this.isDataExpired(data)) {
        console.log('🕒 Все данные автосохранения устарели');
        return;
      }

      const savedTime = new Date(data.timestamp);
      console.log(`🔄 Восстановление данных от ${savedTime.toLocaleString()} (источник: ${source})`);
      
      // Восстанавливаем всё
      this.restoreCartData(data.cart);
      this.restoreFormData(data.forms);
      this.restoreUIState(data.ui);
      this.restoreFilters(data.filters);
      this.restorePopupState(data.popups);
      this.restoreScrollPosition(data.scroll);

    } catch (error) {
      console.error('❌ Ошибка восстановления:', error);
    }
  }

  async restoreFromServer() {
    try {
      const response = await fetch('/api/v1/autosave', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('☁️ Данные восстановлены с сервера');
          return result.data;
        }
      }
    } catch (error) {
      console.warn('⚠️ Не удалось получить данные с сервера:', error);
    }
    return null;
  }

  isDataExpired(data) {
    if (!data || !data.timestamp) return true;
    
    const savedTime = new Date(data.timestamp);
    const now = new Date();
    const diffMinutes = (now - savedTime) / (1000 * 60);
    
    // Данные устарели, если старше 2 часов
    return diffMinutes > 120;
  }

  // === СОХРАНЕНИЕ ДАННЫХ ===

  getCartData() {
    // Корзина уже сохраняется в localStorage, просто копируем
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : null;
  }

  getFormData() {
    const forms = {};
    
    // Все input, textarea, select на странице
    document.querySelectorAll('input, textarea, select').forEach(field => {
      if (field.name || field.id) {
        const key = field.name || field.id;
        
        if (field.type === 'checkbox' || field.type === 'radio') {
          forms[key] = field.checked;
        } else if (field.type !== 'password') { // Пароли не сохраняем
          forms[key] = field.value;
        }
      }
    });

    return forms;
  }

  getUIState() {
    return {
      // Активные табы
      activeTabs: this.getActiveTabs(),
      
      // Открытые аккордеоны
      openAccordions: this.getOpenAccordions(),
      
      // Состояние мобильного меню
      mobileMenuOpen: document.body.classList.contains('mobile-menu-open'),
      
      // Режим просмотра (сетка/список)
      viewMode: document.querySelector('.view-mode.active')?.dataset?.mode,
      
      // Выбранный язык/валюта
      currency: document.querySelector('.currency-selector')?.value,
      language: document.querySelector('.language-selector')?.value
    };
  }

  getFilters() {
    const filters = {};
    
    // Фильтры в каталоге
    document.querySelectorAll('.filter-input').forEach(filter => {
      if (filter.checked) {
        const category = filter.dataset.category || 'general';
        if (!filters[category]) filters[category] = [];
        filters[category].push(filter.value);
      }
    });

    // Поисковая строка
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      filters.search = searchInput.value;
    }

    // Сортировка
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) {
      filters.sort = sortSelect.value;
    }

    return filters;
  }

  getPopupState() {
    const popups = [];
    
    document.querySelectorAll('.popup, .modal').forEach(popup => {
      if (popup.style.display === 'block' || popup.classList.contains('active')) {
        popups.push({
          id: popup.id,
          className: popup.className,
          // Если это попап товара, сохраняем ID товара
          productId: popup.dataset?.productId
        });
      }
    });

    return popups;
  }

  getScrollPosition() {
    return {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset
    };
  }

  getCurrentPage() {
    return {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      title: document.title
    };
  }

  getActiveTabs() {
    const tabs = [];
    document.querySelectorAll('.tab.active, .tab-button.active').forEach(tab => {
      tabs.push({
        id: tab.id,
        value: tab.dataset.tab || tab.value
      });
    });
    return tabs;
  }

  getOpenAccordions() {
    const accordions = [];
    document.querySelectorAll('.accordion-item.open').forEach(item => {
      accordions.push(item.id || item.dataset.accordion);
    });
    return accordions;
  }

  // === ВОССТАНОВЛЕНИЕ ДАННЫХ ===

  restoreCartData(cart) {
    if (cart) {
      // Корзина уже восстанавливается автоматически при загрузке
      console.log('🛒 Корзина восстановлена');
    }
  }

  restoreFormData(forms) {
    if (!forms) return;

    Object.entries(forms).forEach(([key, value]) => {
      const field = document.querySelector(`[name="${key}"], #${key}`);
      if (field) {
        if (field.type === 'checkbox' || field.type === 'radio') {
          field.checked = value;
        } else {
          field.value = value;
        }
        
        // Триггерим событие для обновления связанной логики
        field.dispatchEvent(new Event('change'));
      }
    });

    console.log('📝 Формы восстановлены');
  }

  restoreUIState(ui) {
    if (!ui) return;

    // Восстанавливаем табы
    if (ui.activeTabs) {
      ui.activeTabs.forEach(tab => {
        const element = document.getElementById(tab.id);
        if (element) {
          element.click();
        }
      });
    }

    // Режим просмотра
    if (ui.viewMode) {
      const modeButton = document.querySelector(`[data-mode="${ui.viewMode}"]`);
      if (modeButton) modeButton.click();
    }

    // Валюта/язык
    if (ui.currency) {
      const currencySelect = document.querySelector('.currency-selector');
      if (currencySelect) {
        currencySelect.value = ui.currency;
        currencySelect.dispatchEvent(new Event('change'));
      }
    }

    console.log('🎨 UI состояние восстановлено');
  }

  restoreFilters(filters) {
    if (!filters) return;

    // Поиск
    if (filters.search) {
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.value = filters.search;
      }
    }

    // Сортировка
    if (filters.sort) {
      const sortSelect = document.querySelector('.sort-select');
      if (sortSelect) {
        sortSelect.value = filters.sort;
      }
    }

    // Фильтры категорий
    Object.entries(filters).forEach(([category, values]) => {
      if (Array.isArray(values)) {
        values.forEach(value => {
          const checkbox = document.querySelector(`[data-category="${category}"][value="${value}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      }
    });

    console.log('🔍 Фильтры восстановлены');
  }

  restorePopupState(popups) {
    if (!popups || !popups.length) return;

    // Восстанавливаем попапы с небольшой задержкой
    setTimeout(() => {
      popups.forEach(popup => {
        const element = document.getElementById(popup.id);
        if (element) {
          element.style.display = 'block';
          element.classList.add('active');
          
          // Если это попап товара, загружаем данные
          if (popup.productId && window.showProductPopup) {
            window.showProductPopup(popup.productId);
          }
        }
      });
    }, 1000);

    console.log('🪟 Попапы восстановлены');
  }

  restoreScrollPosition(scroll) {
    if (!scroll) return;

    // Восстанавливаем позицию скролла с задержкой
    setTimeout(() => {
      window.scrollTo(scroll.x, scroll.y);
    }, 500);

    console.log('📜 Позиция скролла восстановлена');
  }

  // === УТИЛИТЫ ===

  showSaveIndicator(type = 'success') {
    // Показываем небольшой индикатор сохранения
    const indicator = document.createElement('div');
    
    const config = {
      success: {
        text: '💾 Автосохранение',
        background: '#4CAF50'
      },
      error: {
        text: '⚠️ Ошибка сохранения',
        background: '#f44336'
      }
    };
    
    const { text, background } = config[type] || config.success;
    
    indicator.innerHTML = text;
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${background};
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      opacity: 0.9;
      transition: opacity 0.3s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(indicator);
    
    // Убираем через 3 секунды (дольше для ошибок)
    const duration = type === 'error' ? 4000 : 2000;
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, duration);
  }

  // Принудительное сохранение (для вызова извне)
  forceSave() {
    this.saveEverything();
    console.log('🔧 Принудительное сохранение выполнено');
  }

  // Очистка автосохранения
  async clearSaved() {
    // Очищаем локально
    localStorage.removeItem(this.STORAGE_KEY);
    
    // Очищаем на сервере
    try {
      await fetch('/api/v1/autosave', {
        method: 'DELETE',
        credentials: 'include'
      });
      console.log('🗑️ Автосохранение очищено (локально и на сервере)');
    } catch (error) {
      console.log('🗑️ Автосохранение очищено локально (сервер недоступен)');
    }
  }

  // Остановка автосохранения
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('⏹️ Автосохранение остановлено');
    }
  }
}

// Глобальный экземпляр
window.AutoSave = new AutoSave();

// API для управления извне
window.autosave = {
  save: () => window.AutoSave.forceSave(),
  clear: () => window.AutoSave.clearSaved(),
  stop: () => window.AutoSave.stop(),
  restart: () => {
    window.AutoSave.stop();
    window.AutoSave = new AutoSave();
  }
};

console.log('✅ Система автосохранения инициализирована');
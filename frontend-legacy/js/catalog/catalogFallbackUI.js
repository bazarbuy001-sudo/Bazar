/**
 * catalogFallbackUI.js
 * 
 * Phase 5A: Fallback UI Extension for Catalog
 * 
 * This is an EventBus-based UI extension.
 * It does NOT redefine or replace CatalogCore.
 * 
 * ARCHITECTURE RULES:
 * - Does NOT define window.CatalogCore
 * - Listens to CatalogEventBus events
 * - Creates fallback UI independently
 * - Works alongside existing catalog-core.js
 * 
 * LOAD ORDER:
 * 1. eventBus.js
 * 2. dataStore.js
 * 3. dataStore-errorHandling.js
 * 4. catalog-core.js (existing)
 * 5. catalogFallbackUI.js (this file)
 */

(function() {
  'use strict';

  /**
   * CatalogFallbackUI
   * Handles error states and fallback display for catalog
   */
  var CatalogFallbackUI = {

    /**
     * Configuration
     */
    config: {
      gridSelector: '#catalogGrid',
      fallbackId: 'catalogFallback',
      messages: {
        title: 'Каталог временно недоступен',
        defaultError: 'Произошла ошибка при загрузке товаров. Пожалуйста, попробуйте позже.',
        retryButton: 'Повторить'
      }
    },

    /**
     * DOM references
     */
    elements: {
      grid: null,
      fallback: null,
      retryButton: null
    },

    /**
     * State
     */
    state: {
      isInitialized: false,
      isVisible: false
    },

    /**
     * Initialize the fallback UI
     */
    init: function() {
      if (this.state.isInitialized) {
        console.log('[CatalogFallbackUI] Already initialized');
        return;
      }

      // Find catalog grid
      this.elements.grid = document.querySelector(this.config.gridSelector);

      if (!this.elements.grid) {
        console.warn('[CatalogFallbackUI] Catalog grid not found:', this.config.gridSelector);
        // Still initialize - grid might be added dynamically
      }

      // Create fallback UI element
      this._createFallbackElement();

      // Bind to EventBus
      this._bindEvents();

      this.state.isInitialized = true;
      console.log('[CatalogFallbackUI] Initialized');
    },

    /**
     * Create the fallback UI element
     */
    _createFallbackElement: function() {
      // Check if already exists
      var existing = document.getElementById(this.config.fallbackId);
      if (existing) {
        this.elements.fallback = existing;
        this.elements.retryButton = existing.querySelector('.catalog-fallback__retry');
        this._bindRetryButton();
        return;
      }

      // Create fallback container
      var fallback = document.createElement('div');
      fallback.id = this.config.fallbackId;
      fallback.className = 'catalog-fallback';
      fallback.setAttribute('hidden', '');
      fallback.setAttribute('role', 'alert');
      fallback.setAttribute('aria-live', 'polite');

      fallback.innerHTML = 
        '<div class="catalog-fallback__content">' +
          '<div class="catalog-fallback__icon" aria-hidden="true">⚠️</div>' +
          '<h2 class="catalog-fallback__title">' + this.config.messages.title + '</h2>' +
          '<p class="catalog-fallback__message">' + this.config.messages.defaultError + '</p>' +
          '<button class="catalog-fallback__retry btn" type="button">' + 
            this.config.messages.retryButton + 
          '</button>' +
        '</div>';

      // Insert into DOM
      if (this.elements.grid && this.elements.grid.parentNode) {
        this.elements.grid.parentNode.insertBefore(fallback, this.elements.grid.nextSibling);
      } else {
        // Fallback: append to main content area or body
        var mainContent = document.querySelector('main') || 
                          document.querySelector('.catalog') || 
                          document.querySelector('.content') ||
                          document.body;
        mainContent.appendChild(fallback);
      }

      this.elements.fallback = fallback;
      this.elements.retryButton = fallback.querySelector('.catalog-fallback__retry');

      // Bind retry button
      this._bindRetryButton();

      console.log('[CatalogFallbackUI] Fallback element created');
    },

    /**
     * Bind retry button click handler
     */
    _bindRetryButton: function() {
      if (!this.elements.retryButton) return;

      var self = this;
      this.elements.retryButton.addEventListener('click', function(e) {
        e.preventDefault();
        self._handleRetry();
      });
    },

    /**
     * Bind to CatalogEventBus events
     */
    _bindEvents: function() {
      var self = this;

      // Wait for EventBus
      if (!window.CatalogEventBus) {
        console.warn('[CatalogFallbackUI] CatalogEventBus not available, waiting...');
        setTimeout(function() {
          self._bindEvents();
        }, 100);
        return;
      }

      // Avoid double-binding
      if (this._eventsBound) {
        console.log('[CatalogFallbackUI] EventBus already bound');
        return;
      }

      // Named handlers so we can unsubscribe later
      this._onCatalogError = function(data) {
        console.log('[CatalogFallbackUI] Received catalog:error', data);
        self.show(data && data.message ? data.message : null);
      };

      this._onCatalogLoaded = function(data) {
        console.log('[CatalogFallbackUI] Received catalog:loaded');
        self.hide();
      };

      this._onCatalogRendered = function(data) {
        console.log('[CatalogFallbackUI] Received catalog:rendered');
        self.hide();
      };

      // Subscribe and keep unsubscribe functions
      try {
        this._unsubscribers = this._unsubscribers || [];
        var unsub1 = window.CatalogEventBus.on('catalog:error', this._onCatalogError);
        var unsub2 = window.CatalogEventBus.on('catalog:loaded', this._onCatalogLoaded);
        var unsub3 = window.CatalogEventBus.on('catalog:rendered', this._onCatalogRendered);
        this._unsubscribers.push(unsub1, unsub2, unsub3);
        this._eventsBound = true;
        console.log('[CatalogFallbackUI] EventBus bindings complete');
      } catch (err) {
        console.error('[CatalogFallbackUI] Failed to bind EventBus handlers', err);
      }
    },

    /**
     * Handle retry button click
     */
    _handleRetry: function() {
      var self = this;

      console.log('[CatalogFallbackUI] Retry requested');

      // Disable button during retry
      if (this.elements.retryButton) {
        this.elements.retryButton.disabled = true;
        this.elements.retryButton.classList.add('is-loading');
      }

      // Check for DataStore retry method
      if (window.CatalogDataStore && typeof window.CatalogDataStore.retry === 'function') {
        window.CatalogDataStore.retry()
          .then(function() {
            self._resetRetryButton();
            // Success will be handled by catalog:loaded event
          })
          .catch(function(error) {
            self._resetRetryButton();
            // Error will be handled by catalog:error event
          });
      } else if (window.CatalogDataStore && typeof window.CatalogDataStore.loadProducts === 'function') {
        // Fallback to loadProducts
        window.CatalogDataStore.loadProducts()
          .then(function() {
            self._resetRetryButton();
          })
          .catch(function(error) {
            self._resetRetryButton();
          });
      } else if (window.CatalogCore && typeof window.CatalogCore.loadProducts === 'function') {
        // Try CatalogCore
        window.CatalogCore.loadProducts()
          .then(function() {
            self._resetRetryButton();
          })
          .catch(function(error) {
            self._resetRetryButton();
          });
      } else {
        console.error('[CatalogFallbackUI] No retry method available');
        this._resetRetryButton();
        // Emit event for other modules to handle
        if (window.CatalogEventBus) {
          window.CatalogEventBus.emit('catalog:retry-requested');
        }
      }
    },

    /**
     * Reset retry button state
     */
    _resetRetryButton: function() {
      if (this.elements.retryButton) {
        this.elements.retryButton.disabled = false;
        this.elements.retryButton.classList.remove('is-loading');
      }
    },

    /**
     * Show the fallback UI
     * @param {string} [message] - Optional error message
     */
    show: function(message) {
      if (!this.elements.fallback) {
        this._createFallbackElement();
      }

      // Update message if provided
      if (message) {
        var msgEl = this.elements.fallback.querySelector('.catalog-fallback__message');
        if (msgEl) {
          msgEl.textContent = message;
        }
      }

      // Hide grid
      if (this.elements.grid) {
        this.elements.grid.setAttribute('hidden', '');
      }

      // Show fallback
      this.elements.fallback.removeAttribute('hidden');
      this.state.isVisible = true;

      // Reset retry button
      this._resetRetryButton();

      console.log('[CatalogFallbackUI] Shown');
    },

    /**
     * Hide the fallback UI
     */
    hide: function() {
      if (!this.elements.fallback) return;

      // Show grid
      if (this.elements.grid) {
        this.elements.grid.removeAttribute('hidden');
      }

      // Hide fallback
      this.elements.fallback.setAttribute('hidden', '');
      this.state.isVisible = false;

      console.log('[CatalogFallbackUI] Hidden');
    },

    /**
     * Check if fallback is visible
     * @returns {boolean}
     */
    isVisible: function() {
      return this.state.isVisible;
    },

    /**
     * Update configuration
     * @param {Object} config
     */
    configure: function(config) {
      if (config.gridSelector) {
        this.config.gridSelector = config.gridSelector;
        this.elements.grid = document.querySelector(config.gridSelector);
      }
      if (config.messages) {
        Object.assign(this.config.messages, config.messages);
      }
    }

    ,
    /**
     * Destroy the fallback UI and unsubscribe EventBus handlers
     */
    destroy: function() {
      if (!this.state.isInitialized) return;

      // Unsubscribe EventBus handlers if available
      if (this._unsubscribers && Array.isArray(this._unsubscribers)) {
        this._unsubscribers.forEach(function(u) {
          try { if (typeof u === 'function') u(); } catch (e) {}
        });
        this._unsubscribers = [];
      }

      // Remove DOM element
      if (this.elements.fallback && this.elements.fallback.parentNode) {
        this.elements.fallback.parentNode.removeChild(this.elements.fallback);
      }

      // Reset state
      this.elements.grid = null;
      this.elements.fallback = null;
      this.elements.retryButton = null;
      this.state.isInitialized = false;
      this.state.isVisible = false;
      this._eventsBound = false;

      console.log('[CatalogFallbackUI] Destroyed');
    }

  };

  /**
   * Initialize on DOM ready
   */
  function initWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        CatalogFallbackUI.init();
      });
    } else {
      CatalogFallbackUI.init();
    }
  }

  initWhenReady();

  // Expose globally (new namespace, no conflict)
  window.CatalogFallbackUI = CatalogFallbackUI;

})();


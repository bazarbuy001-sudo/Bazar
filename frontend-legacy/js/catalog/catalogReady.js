/**
 * catalogReady.js
 * 
 * Phase 5B: Dependency Guards & Race Condition Protection
 * 
 * Centralized helper for safe module initialization.
 * Ensures modules wait for catalog dependencies before executing.
 * 
 * LOAD ORDER: Load AFTER eventBus.js, BEFORE other catalog modules
 * 
 * Usage:
 *   CatalogReady.waitForCatalog(function() {
 *     // Safe to use CatalogDataStore here
 *   });
 * 
 *   CatalogReady.waitForDependencies(['CatalogDataStore', 'CatalogEventBus'], function() {
 *     // Safe to use both
 *   });
 */

(function() {
  'use strict';

  /**
   * Configuration
   */
  var CONFIG = {
    MAX_WAIT_ATTEMPTS: 100,    // Maximum polling attempts
    POLL_INTERVAL_MS: 50,      // Polling interval
    LOG_PREFIX: '[CatalogReady]'
  };

  /**
   * CatalogReady
   * Helper module for safe initialization
   */
  var CatalogReady = {

    /**
     * Track if catalog data is loaded
     */
    _catalogLoaded: false,

    /**
     * Whether CatalogReady has been initialized (to avoid duplicate subscriptions)
     */
    _initialized: false,

    /**
     * Pending callbacks waiting for catalog
     */
    _pendingCallbacks: [],

    /**
     * Initialize the helper
     */
    init: function() {
      var self = this;

      if (this._initialized) {
        console.log(CONFIG.LOG_PREFIX, 'Already initialized');
        return;
      }

      // Listen for catalog:loaded event when EventBus is available
      this._waitForEventBus(function() {
        // Named handler so we can unsubscribe if needed
        self._onCatalogLoaded = function() {
          self._catalogLoaded = true;
          self._flushPendingCallbacks();
          console.log(CONFIG.LOG_PREFIX, 'Catalog loaded, all pending initializations executed');
        };

        window.CatalogEventBus.on('catalog:loaded', self._onCatalogLoaded);

        // Check if already loaded (DataStore might have loaded before we subscribed)
        if (window.CatalogDataStore && 
            typeof window.CatalogDataStore.isLoaded === 'function' && 
            window.CatalogDataStore.isLoaded()) {
          self._catalogLoaded = true;
          self._flushPendingCallbacks();
        }
      });

      this._initialized = true;

      console.log(CONFIG.LOG_PREFIX, 'Initialized');
    },

    /**
     * Wait for EventBus to be available
     * @param {Function} callback
     */
    _waitForEventBus: function(callback) {
      var attempts = 0;

      function check() {
        attempts++;
        if (window.CatalogEventBus && typeof window.CatalogEventBus.on === 'function') {
          callback();
        } else if (attempts < CONFIG.MAX_WAIT_ATTEMPTS) {
          setTimeout(check, CONFIG.POLL_INTERVAL_MS);
        } else {
          console.error(CONFIG.LOG_PREFIX, 'CatalogEventBus not available after', CONFIG.MAX_WAIT_ATTEMPTS, 'attempts');
        }
      }

      check();
    },

    /**
     * Execute all pending callbacks
     */
    _flushPendingCallbacks: function() {
      var callbacks = this._pendingCallbacks.slice();
      this._pendingCallbacks = [];

      callbacks.forEach(function(item) {
        try {
          item.callback();
          if (item.moduleName) {
            console.log(CONFIG.LOG_PREFIX, item.moduleName, 'initialized (was waiting for catalog)');
          }
        } catch (error) {
          console.error(CONFIG.LOG_PREFIX, 'Error executing callback:', error);
        }
      });
    },

    /**
     * Wait for catalog data to be loaded
     * @param {Function} callback - Function to execute when ready
     * @param {string} [moduleName] - Optional module name for logging
     */
    waitForCatalog: function(callback, moduleName) {
      if (typeof callback !== 'function') {
        console.error(CONFIG.LOG_PREFIX, 'waitForCatalog requires a function callback');
        return;
      }

      // If already loaded, execute immediately
      if (this._catalogLoaded) {
        try {
          callback();
          if (moduleName) {
            console.log(CONFIG.LOG_PREFIX, moduleName, 'initialized immediately (catalog already loaded)');
          }
        } catch (error) {
          console.error(CONFIG.LOG_PREFIX, 'Error executing callback:', error);
        }
        return;
      }

      // Otherwise queue for later
      this._pendingCallbacks.push({
        callback: callback,
        moduleName: moduleName
      });

      if (moduleName) {
        console.log(CONFIG.LOG_PREFIX, moduleName, 'waiting for catalog:loaded');
      }
    },

    /**
     * Wait for specific global dependencies
     * @param {Array<string>} dependencies - Array of global object names
     * @param {Function} callback - Function to execute when all dependencies available
     * @param {string} [moduleName] - Optional module name for logging
     */
    waitForDependencies: function(dependencies, callback, moduleName) {
      var self = this;
      var attempts = 0;

      if (!Array.isArray(dependencies) || dependencies.length === 0) {
        console.error(CONFIG.LOG_PREFIX, 'waitForDependencies requires an array of dependency names');
        return;
      }

      function checkDependencies() {
        attempts++;

        var missing = dependencies.filter(function(dep) {
          return typeof window[dep] === 'undefined';
        });

        if (missing.length === 0) {
          // All dependencies available
          try {
            callback();
            if (moduleName) {
              console.log(CONFIG.LOG_PREFIX, moduleName, 'initialized (all dependencies ready)');
            }
          } catch (error) {
            console.error(CONFIG.LOG_PREFIX, 'Error executing callback for', moduleName, ':', error);
          }
        } else if (attempts < CONFIG.MAX_WAIT_ATTEMPTS) {
          setTimeout(checkDependencies, CONFIG.POLL_INTERVAL_MS);
        } else {
          console.error(CONFIG.LOG_PREFIX, moduleName || 'Module', 'initialization aborted. Missing dependencies:', missing.join(', '));
        }
      }

      checkDependencies();
    },

    /**
     * Check if a global dependency exists
     * @param {string} name - Global object name
     * @returns {boolean}
     */
    hasDependency: function(name) {
      return typeof window[name] !== 'undefined';
    },

    /**
     * Check if catalog is loaded
     * @returns {boolean}
     */
    isCatalogLoaded: function() {
      return this._catalogLoaded;
    },

    /**
     * Guard wrapper - executes callback only if dependencies exist
     * @param {Array<string>} dependencies - Required dependencies
     * @param {Function} callback - Function to execute
     * @param {string} moduleName - Module name for error logging
     * @returns {boolean} - Whether callback was executed
     */
    guard: function(dependencies, callback, moduleName) {
      var missing = dependencies.filter(function(dep) {
        return typeof window[dep] === 'undefined';
      });

      if (missing.length > 0) {
        console.error(CONFIG.LOG_PREFIX, '[' + moduleName + ']', 'Missing dependencies:', missing.join(', '), '- Initialization aborted.');
        return false;
      }

      try {
        callback();
        return true;
      } catch (error) {
        console.error(CONFIG.LOG_PREFIX, '[' + moduleName + ']', 'Error during initialization:', error);
        return false;
      }
    }

    ,
    /**
     * Destroy CatalogReady (unsubscribe event handlers)
     */
    destroy: function() {
      if (!this._initialized) return;
      if (window.CatalogEventBus && typeof window.CatalogEventBus.off === 'function' && typeof this._onCatalogLoaded === 'function') {
        try {
          window.CatalogEventBus.off('catalog:loaded', this._onCatalogLoaded);
        } catch (e) {
          console.warn(CONFIG.LOG_PREFIX, 'Failed to off catalog:loaded', e);
        }
      }
      this._onCatalogLoaded = null;
      this._initialized = false;
      console.log(CONFIG.LOG_PREFIX, 'Destroyed');
    }

  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      CatalogReady.init();
    });
  } else {
    CatalogReady.init();
  }

  // Expose globally
  window.CatalogReady = CatalogReady;

})();


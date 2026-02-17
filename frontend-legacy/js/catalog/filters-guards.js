/**
 * filters-guards.js
 * 
 * Phase 5B: Dependency Guards for CatalogFilters
 * 
 * This file should be loaded AFTER filters.js
 * It patches CatalogFilters to wait for catalog data before rendering filter options.
 * 
 * DOES NOT replace filters.js - only adds guards.
 */

(function() {
  'use strict';

  var MODULE_NAME = 'CatalogFilters';
  var LOG_PREFIX = '[' + MODULE_NAME + ' Guards]';

  /**
   * Apply guards to CatalogFilters
   */
  function applyGuards() {
    
    // Check if CatalogFilters exists
    if (typeof window.CatalogFilters === 'undefined') {
      console.warn(LOG_PREFIX, 'CatalogFilters not found, guards not applied');
      return;
    }

    // Check if already guarded
    if (window.CatalogFilters._guardsApplied) {
      console.log(LOG_PREFIX, 'Guards already applied');
      return;
    }

    var Filters = window.CatalogFilters;

    // Store original methods
    var originalInit = Filters.init;
    var originalRenderFilters = Filters.renderFilters || Filters.render;
    var originalApplyFilters = Filters.applyFilters || Filters.apply;

    /**
     * Guarded init method
     */
    Filters.init = function() {
      var self = this;

      // Check for CatalogReady helper
      if (!window.CatalogReady) {
        console.warn(LOG_PREFIX, 'CatalogReady not found. Using fallback.');
        
        if (!window.CatalogDataStore) {
          console.error(LOG_PREFIX, 'CatalogDataStore not found. Initialization aborted.');
          return;
        }
        
        if (typeof originalInit === 'function') {
          return originalInit.call(self);
        }
        return;
      }

      // Guard: Wait for catalog to be loaded before initializing filters
      window.CatalogReady.waitForCatalog(function() {
        if (typeof originalInit === 'function') {
          originalInit.call(self);
        }
        console.log(LOG_PREFIX, 'Initialized with catalog data');
      }, MODULE_NAME);
    };

    /**
     * Guarded renderFilters method
     */
    if (typeof originalRenderFilters === 'function') {
      var renderMethodName = Filters.renderFilters ? 'renderFilters' : 'render';
      
      Filters[renderMethodName] = function() {
        var self = this;

        // Check DataStore
        if (!window.CatalogDataStore) {
          console.error(LOG_PREFIX, 'CatalogDataStore not available for rendering filters');
          return;
        }

        // Check if loaded
        if (window.CatalogDataStore.isLoaded && !window.CatalogDataStore.isLoaded()) {
          console.warn(LOG_PREFIX, 'Catalog not loaded, deferring filter render');
          
          if (window.CatalogEventBus) {
            window.CatalogEventBus.on('catalog:loaded', function() {
              originalRenderFilters.call(self);
            });
          }
          return;
        }

        return originalRenderFilters.call(self);
      };
    }

    /**
     * Guarded applyFilters method
     */
    if (typeof originalApplyFilters === 'function') {
      var applyMethodName = Filters.applyFilters ? 'applyFilters' : 'apply';
      
      Filters[applyMethodName] = function() {
        var self = this;
        var args = arguments;

        // Check DataStore
        if (!window.CatalogDataStore) {
          console.error(LOG_PREFIX, 'CatalogDataStore not available for applying filters');
          return [];
        }

        // Check if loaded
        if (window.CatalogDataStore.isLoaded && !window.CatalogDataStore.isLoaded()) {
          console.warn(LOG_PREFIX, 'Catalog not loaded yet');
          return [];
        }

        return originalApplyFilters.apply(self, args);
      };
    }

    Filters._guardsApplied = true;
    console.log(LOG_PREFIX, 'Guards applied successfully');
  }

  // Apply when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGuards);
  } else {
    setTimeout(applyGuards, 0);
  }

})();


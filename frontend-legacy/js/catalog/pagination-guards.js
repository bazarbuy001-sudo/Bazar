/**
 * pagination-guards.js
 * 
 * Phase 5B: Dependency Guards for CatalogPagination
 * 
 * This file should be loaded AFTER pagination.js
 * It patches CatalogPagination to wait for catalog data.
 * 
 * DOES NOT replace pagination.js - only adds guards.
 */

(function() {
  'use strict';

  var MODULE_NAME = 'CatalogPagination';
  var LOG_PREFIX = '[' + MODULE_NAME + ' Guards]';

  /**
   * Apply guards to CatalogPagination
   */
  function applyGuards() {
    
    // Check if CatalogPagination exists
    if (typeof window.CatalogPagination === 'undefined') {
      console.warn(LOG_PREFIX, 'CatalogPagination not found, guards not applied');
      return;
    }

    // Check if already guarded
    if (window.CatalogPagination._guardsApplied) {
      console.log(LOG_PREFIX, 'Guards already applied');
      return;
    }

    var Pagination = window.CatalogPagination;

    // Store original methods
    var originalInit = Pagination.init;
    var originalApplyPagination = Pagination.applyPagination || Pagination.apply;
    var originalRender = Pagination.render || Pagination.renderControls;

    /**
     * Guarded init method
     */
    Pagination.init = function() {
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

      // Guard: Wait for catalog
      window.CatalogReady.waitForCatalog(function() {
        if (typeof originalInit === 'function') {
          originalInit.call(self);
        }
        console.log(LOG_PREFIX, 'Initialized');
      }, MODULE_NAME);
    };

    /**
     * Guarded applyPagination method
     */
    if (typeof originalApplyPagination === 'function') {
      var applyMethodName = Pagination.applyPagination ? 'applyPagination' : 'apply';
      
      Pagination[applyMethodName] = function(products) {
        var self = this;

        // Check DataStore
        if (!window.CatalogDataStore) {
          console.error(LOG_PREFIX, 'CatalogDataStore not available');
          return products || [];
        }

        // If no products provided and catalog not loaded, defer
        if (!products && window.CatalogDataStore.isLoaded && !window.CatalogDataStore.isLoaded()) {
          console.warn(LOG_PREFIX, 'Catalog not loaded, cannot paginate');
          return [];
        }

        return originalApplyPagination.call(self, products);
      };
    }

    /**
     * Guarded render method
     */
    if (typeof originalRender === 'function') {
      var renderMethodName = Pagination.render ? 'render' : 'renderControls';
      
      Pagination[renderMethodName] = function() {
        var self = this;
        var args = arguments;

        // Check DataStore
        if (!window.CatalogDataStore) {
          console.error(LOG_PREFIX, 'CatalogDataStore not available for render');
          return;
        }

        return originalRender.apply(self, args);
      };
    }

    Pagination._guardsApplied = true;
    console.log(LOG_PREFIX, 'Guards applied successfully');
  }

  // Apply when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGuards);
  } else {
    setTimeout(applyGuards, 0);
  }

})();


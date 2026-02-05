/**
 * searchController-guards.js
 * 
 * Phase 5B: Dependency Guards for SearchController
 * 
 * This file should be loaded AFTER searchController.js
 * It patches the SearchController to wait for catalog data before searching.
 * 
 * DOES NOT replace searchController.js - only adds guards.
 */

(function() {
  'use strict';

  var MODULE_NAME = 'SearchController';
  var LOG_PREFIX = '[' + MODULE_NAME + ' Guards]';

  /**
   * Apply guards to SearchController
   */
  function applyGuards() {
    
    // Check if SearchController exists
    if (typeof window.SearchController === 'undefined') {
      console.warn(LOG_PREFIX, 'SearchController not found, guards not applied');
      return;
    }

    // Check if already guarded
    if (window.SearchController._guardsApplied) {
      console.log(LOG_PREFIX, 'Guards already applied');
      return;
    }

    var SearchController = window.SearchController;

    // Store original methods
    var originalInit = SearchController.init;
    var originalSearch = SearchController.search;
    var originalHandleSearch = SearchController.handleSearch;

    /**
     * Guarded init method
     */
    SearchController.init = function() {
      var self = this;

      // Check for CatalogReady helper
      if (!window.CatalogReady) {
        console.warn(LOG_PREFIX, 'CatalogReady not found. Using fallback initialization.');
        
        // Fallback: Check dependencies directly
        if (!window.CatalogDataStore) {
          console.error(LOG_PREFIX, 'CatalogDataStore not found. Initialization aborted.');
          return;
        }
        
        if (typeof originalInit === 'function') {
          return originalInit.call(self);
        }
        return;
      }

      // Guard: Wait for dependencies
      window.CatalogReady.waitForDependencies(
        ['CatalogDataStore', 'CatalogEventBus'],
        function() {
          if (typeof originalInit === 'function') {
            originalInit.call(self);
          }
          console.log(LOG_PREFIX, 'Initialized');
        },
        MODULE_NAME
      );
    };

    /**
     * Guarded search method
     */
    if (typeof originalSearch === 'function') {
      SearchController.search = function(query) {
        var self = this;

        // Check DataStore availability
        if (!window.CatalogDataStore) {
          console.error(LOG_PREFIX, 'CatalogDataStore not available for search');
          return [];
        }

        // Check if catalog is loaded
        if (window.CatalogDataStore.isLoaded && !window.CatalogDataStore.isLoaded()) {
          console.warn(LOG_PREFIX, 'Catalog not loaded yet. Search deferred.');
          
          // Queue search for after load
          if (window.CatalogEventBus) {
            window.CatalogEventBus.on('catalog:loaded', function() {
              originalSearch.call(self, query);
            });
          }
          return [];
        }

        return originalSearch.call(self, query);
      };
    }

    /**
     * Guarded handleSearch method (if exists)
     */
    if (typeof originalHandleSearch === 'function') {
      SearchController.handleSearch = function(e) {
        var self = this;

        // Check DataStore availability
        if (!window.CatalogDataStore) {
          console.error(LOG_PREFIX, 'CatalogDataStore not available');
          return;
        }

        // Check if loaded
        if (window.CatalogDataStore.isLoaded && !window.CatalogDataStore.isLoaded()) {
          console.warn(LOG_PREFIX, 'Please wait, catalog is loading...');
          // Could show a loading indicator here
          return;
        }

        return originalHandleSearch.call(self, e);
      };
    }

    SearchController._guardsApplied = true;
    console.log(LOG_PREFIX, 'Guards applied successfully');
  }

  // Apply when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGuards);
  } else {
    setTimeout(applyGuards, 0);
  }

})();


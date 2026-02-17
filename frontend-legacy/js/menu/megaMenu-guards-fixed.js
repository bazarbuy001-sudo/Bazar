/**
 * megaMenu-guards.js
 * 
 * Phase 5B: Dependency Guards for MegaMenu
 * Phase 6: Fixed initialization deadlock
 * 
 * This file should be loaded AFTER megaMenu.js
 * It patches the MegaMenu to wait for dependencies before initializing.
 * 
 * DOES NOT replace megaMenu.js - only adds guards.
 * 
 * FIX APPLIED:
 * - Removed waitForCatalog() which caused deadlock on homepage
 * - Now uses guard() which only checks if dependencies EXIST
 * - Menu initializes immediately after dependencies are available
 * - Categories load on-demand when menu opens or catalog:loaded fires
 */

(function() {
  'use strict';

  var MODULE_NAME = 'MegaMenu';
  var LOG_PREFIX = '[' + MODULE_NAME + ' Guards]';

  /**
   * Apply guards to MegaMenu
   */
  function applyGuards() {
    
    // Check if MegaMenu exists
    if (typeof window.MegaMenu === 'undefined') {
      console.warn(LOG_PREFIX, 'MegaMenu not found, guards not applied');
      return;
    }

    // Check if already guarded
    if (window.MegaMenu._guardsApplied) {
      console.log(LOG_PREFIX, 'Guards already applied');
      return;
    }

    var MegaMenu = window.MegaMenu;

    // Store original init if exists
    var originalInit = MegaMenu.init;
    var originalRenderCategories = MegaMenu.renderCategories;

    /**
     * Guarded init method
     * 
     * IMPORTANT: Does NOT wait for catalog:loaded event!
     * Only waits for dependencies to EXIST, then initializes immediately.
     * This prevents deadlock on homepage where catalog may never load.
     */
    MegaMenu.init = function() {
      var self = this;
      var args = arguments; // Preserve original arguments (container parameter)

      // Check required dependencies
      if (!window.CatalogReady) {
        console.warn(LOG_PREFIX, 'CatalogReady not found. Falling back to direct init.');
        if (typeof originalInit === 'function') {
          return originalInit.apply(self, args);
        }
        return;
      }

      // FIX: Use guard() NOT waitForCatalog()
      // guard() only checks if dependencies exist - does NOT wait for catalog:loaded
      // This allows menu to initialize on homepage even if catalog data never loads
      window.CatalogReady.guard(
        ['CatalogDataStore', 'CatalogEventBus'],
        function() {
          // Initialize menu structure IMMEDIATELY
          // Creates DOM, subscribes to events
          // Menu can now open even if catalog data isn't loaded yet
          if (typeof originalInit === 'function') {
            originalInit.apply(self, args);
          }
          
          // Categories will render:
          // 1. On menu open (handleMenuOpen loads data if needed)
          // 2. When catalog:loaded event fires (handleCatalogLoaded)
          console.log(LOG_PREFIX, 'Initialized (structure ready, categories will load on demand)');
        },
        MODULE_NAME
      );
    };

    /**
     * Guarded renderCategories method
     * 
     * Safely handles case when catalog data isn't loaded yet.
     * Defers rendering until data is available.
     */
    if (typeof originalRenderCategories === 'function') {
      MegaMenu.renderCategories = function() {
        var self = this;

        // Ensure DataStore is available
        if (!window.CatalogDataStore) {
          console.warn(LOG_PREFIX, 'CatalogDataStore not available for renderCategories');
          return;
        }

        // Check if data is loaded (graceful handling)
        if (window.CatalogDataStore.isLoaded && !window.CatalogDataStore.isLoaded()) {
          console.log(LOG_PREFIX, 'Catalog not loaded yet, deferring renderCategories');
          
          // Subscribe to catalog:loaded for when data becomes available
          if (window.CatalogEventBus) {
            // Use once-style listener to avoid duplicates
            var onCatalogLoaded = function() {
              window.CatalogEventBus.off('catalog:loaded', onCatalogLoaded);
              originalRenderCategories.call(self);
            };
            window.CatalogEventBus.on('catalog:loaded', onCatalogLoaded);
          }
          return;
        }

        // Data is loaded - render immediately
        return originalRenderCategories.call(self);
      };
    }

    MegaMenu._guardsApplied = true;
    console.log(LOG_PREFIX, 'Guards applied successfully');
  }

  // Apply when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGuards);
  } else {
    // Small delay to ensure MegaMenu is defined
    setTimeout(applyGuards, 0);
  }

})();

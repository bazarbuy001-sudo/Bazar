/**
 * catalogButton-guards.js
 * 
 * Phase 5B: Dependency Guards for CatalogButton
 * 
 * This file should be loaded AFTER catalogButton.js
 * It patches the catalog button to handle missing dependencies gracefully.
 * 
 * DOES NOT replace catalogButton.js - only adds guards.
 */

(function() {
  'use strict';

  var MODULE_NAME = 'CatalogButton';
  var LOG_PREFIX = '[' + MODULE_NAME + ' Guards]';

  /**
   * Apply guards to CatalogButton
   */
  function applyGuards() {
    
    // Check if CatalogButton exists
    if (typeof window.CatalogButton === 'undefined') {
      console.warn(LOG_PREFIX, 'CatalogButton not found, guards not applied');
      return;
    }

    // Check if already guarded
    if (window.CatalogButton._guardsApplied) {
      console.log(LOG_PREFIX, 'Guards already applied');
      return;
    }

    var Button = window.CatalogButton;

    // Store original methods
    var originalInit = Button.init;
    var originalHandleClick = Button.handleClick || Button.onClick;

    /**
     * Guarded init method
     */
    Button.init = function() {
      var self = this;

      // Check for CatalogReady helper
      if (!window.CatalogReady) {
        console.warn(LOG_PREFIX, 'CatalogReady not found. Using direct init.');
        
        if (typeof originalInit === 'function') {
          return originalInit.call(self);
        }
        return;
      }

      // Guard: Wait for dependencies
      window.CatalogReady.waitForDependencies(
        ['CatalogEventBus'],
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
     * Guarded click handler
     */
    if (typeof originalHandleClick === 'function') {
      var clickMethodName = Button.handleClick ? 'handleClick' : 'onClick';
      
      Button[clickMethodName] = function(e) {
        var self = this;

        // Check EventBus for menu events
        if (!window.CatalogEventBus) {
          console.error(LOG_PREFIX, 'CatalogEventBus not available');
          return;
        }

        return originalHandleClick.call(self, e);
      };
    }

    Button._guardsApplied = true;
    console.log(LOG_PREFIX, 'Guards applied successfully');
  }

  // Apply when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGuards);
  } else {
    setTimeout(applyGuards, 0);
  }

})();


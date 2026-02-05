/**
 * viewportHeight.js
 * 
 * Phase 6: Viewport Height Utility
 * 
 * Fixes the iOS 100vh issue by calculating actual viewport height
 * and setting a CSS custom property.
 * 
 * Problem: On iOS Safari, 100vh includes the hidden address bar,
 * causing content to be cut off when the bar is visible.
 * 
 * Solution: Calculate actual inner height and set --vh property.
 * CSS can then use: height: calc(var(--vh, 1vh) * 100);
 */

(function() {
  'use strict';

  /**
   * ViewportHeight Utility
   */
  var ViewportHeight = {

    /**
     * Debounce timer
     */
    _debounceTimer: null,

    /**
     * Initialize the utility
     */
    init: function() {
      // Set initial value
      this.update();

      // Update on resize (debounced)
      var self = this;
      window.addEventListener('resize', function() {
        self._debouncedUpdate();
      });

      // Update on orientation change
      window.addEventListener('orientationchange', function() {
        // Delay to let browser settle
        setTimeout(function() {
          self.update();
        }, 100);
      });

      // Update when address bar shows/hides (iOS)
      if ('visualViewport' in window) {
        window.visualViewport.addEventListener('resize', function() {
          self._debouncedUpdate();
        });
      }

      console.log('[ViewportHeight] Initialized');
    },

    /**
     * Update the --vh CSS variable
     */
    update: function() {
      // Use visualViewport if available (more accurate on mobile)
      var vh;
      if ('visualViewport' in window && window.visualViewport) {
        vh = window.visualViewport.height * 0.01;
      } else {
        vh = window.innerHeight * 0.01;
      }

      // Set CSS custom property
      document.documentElement.style.setProperty('--vh', vh + 'px');

      console.log('[ViewportHeight] Updated --vh:', vh + 'px');
    },

    /**
     * Debounced update (100ms)
     */
    _debouncedUpdate: function() {
      var self = this;
      
      if (this._debounceTimer) {
        clearTimeout(this._debounceTimer);
      }

      this._debounceTimer = setTimeout(function() {
        self.update();
      }, 100);
    },

    /**
     * Get current viewport height in pixels
     * @returns {number}
     */
    getHeight: function() {
      if ('visualViewport' in window && window.visualViewport) {
        return window.visualViewport.height;
      }
      return window.innerHeight;
    }

  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      ViewportHeight.init();
    });
  } else {
    ViewportHeight.init();
  }

  // Expose globally
  window.ViewportHeight = ViewportHeight;

})();


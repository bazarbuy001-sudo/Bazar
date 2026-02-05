/**
 * scrollLock.js
 * 
 * Phase 6: Unified Scroll Lock Utility
 * 
 * Provides iOS-safe scroll locking with position restoration.
 * Used by: mobile-header.js, product-popup.js, catalogButton.js
 * 
 * IMPORTANT:
 * - Saves scroll position before locking
 * - Restores scroll position after unlocking
 * - Uses CSS custom property for position offset
 * - Supports multiple lock sources (prevents unlock conflicts)
 */

(function() {
  'use strict';

  /**
   * ScrollLock Utility
   */
  var ScrollLock = {

    /**
     * Track active locks to prevent conflicts
     * Multiple components can request lock, but only unlock when all released
     */
    _activeLocks: new Set(),

    /**
     * Stored scroll position
     */
    _scrollPosition: 0,

    /**
     * Check if currently locked
     * @returns {boolean}
     */
    isLocked: function() {
      return this._activeLocks.size > 0;
    },

    /**
     * Lock scrolling
     * @param {string} source - Identifier for the lock source (e.g., 'popup', 'drawer', 'menu')
     */
    lock: function(source) {
      if (!source) {
        console.warn('[ScrollLock] Lock source required');
        source = 'unknown';
      }

      // If this is the first lock, save position and apply styles
      if (this._activeLocks.size === 0) {
        this._scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        // Set CSS custom property for scroll position
        document.documentElement.style.setProperty('--scroll-position', this._scrollPosition);

        // Compensate for scrollbar width to prevent layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = scrollbarWidth + 'px';

        // Add scroll-locked class (CSS handles the rest)
        document.body.classList.add('scroll-locked');

        console.log('[ScrollLock] Locked at position:', this._scrollPosition);
      }

      // Track this lock source
      this._activeLocks.add(source);
      console.log('[ScrollLock] Lock added:', source, '| Active locks:', Array.from(this._activeLocks));
    },

    /**
     * Unlock scrolling
     * @param {string} source - Identifier for the lock source
     */
    unlock: function(source) {
      if (!source) {
        console.warn('[ScrollLock] Unlock source required');
        source = 'unknown';
      }

      // Remove this lock source
      this._activeLocks.delete(source);
      console.log('[ScrollLock] Lock removed:', source, '| Remaining locks:', Array.from(this._activeLocks));

      // If no more locks, restore scrolling
      if (this._activeLocks.size === 0) {
        // Remove scroll-locked class
        document.body.classList.remove('scroll-locked');

        // Clear CSS custom property
        document.documentElement.style.removeProperty('--scroll-position');

        // Remove scrollbar width compensation
        document.body.style.paddingRight = '';

        // Restore scroll position using RAF for proper timing
        requestAnimationFrame(() => {
          if (this._scrollPosition > 0) {
            window.scrollTo({
              top: this._scrollPosition,
              left: 0,
              behavior: 'auto'
            });
          }
        });

        console.log('[ScrollLock] Unlocked, restored position:', this._scrollPosition);
      }
    },

    /**
     * Force unlock all (emergency use only)
     */
    forceUnlockAll: function() {
      console.warn('[ScrollLock] Force unlocking all');

      this._activeLocks.clear();
      document.body.classList.remove('scroll-locked');
      document.documentElement.style.removeProperty('--scroll-position');
      document.body.style.paddingRight = '';

      requestAnimationFrame(() => {
        if (this._scrollPosition > 0) {
          window.scrollTo({
            top: this._scrollPosition,
            left: 0,
            behavior: 'auto'
          });
        }
      });
    },

    /**
     * Get current lock sources (for debugging)
     * @returns {Array}
     */
    getActiveLocks: function() {
      return Array.from(this._activeLocks);
    }

  };

  // Expose globally
  window.ScrollLock = ScrollLock;

  console.log('[ScrollLock] Utility loaded');

})();


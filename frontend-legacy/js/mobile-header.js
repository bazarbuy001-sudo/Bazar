/**
 * mobile-header.js
 * 
 * Mobile header functionality for Bazar Buy
 * This module handles mobile-specific header interactions.
 * 
 * Phase 1: Initialization skeleton
 * Phase 2: Burger menu, drawer, navigation, Mega Menu integration
 * 
 * IMPORTANT: 
 * - Only select elements inside [data-mobile-header] or mobile drawer
 * - Do NOT interact with desktop header elements
 * - Do NOT use shared classes (.catalog-btn, .cart-btn, etc.)
 * - Do NOT modify Mega Menu JS
 */

(function() {
  'use strict';

  /**
   * Mobile Header Module
   * Isolated from desktop header functionality
   */
  const MobileHeader = {
    
    /**
     * Module state
     */
    state: {
      isDrawerOpen: false,
      isInitialized: false,
      scrollPosition: 0,        // Phase 6: Track scroll position
      resizeHandler: null       // Phase 6: Store resize handler reference
    },

    /**
     * DOM element references
     */
    elements: {
      // Phase 1 elements
      header: null,
      burger: null,
      logo: null,
      search: null,
      cart: null,
      // Phase 2 elements
      overlay: null,
      drawer: null,
      drawerContent: null
    },

    /**
     * Initialize the mobile header
     * Only runs on mobile viewports
     */
    init: function() {
      // Only initialize on mobile viewports
      if (window.innerWidth > 768) {
        console.log('[MobileHeader] Desktop viewport detected, skipping initialization');
        return;
      }

      // Prevent double initialization
      if (this.state.isInitialized) {
        console.log('[MobileHeader] Already initialized, skipping');
        return;
      }

      // Select the mobile header container
      this.elements.header = document.querySelector('[data-mobile-header]');
      
      if (!this.elements.header) {
        console.warn('[MobileHeader] Mobile header element not found');
        return;
      }

      // Cache Phase 1 element references (scoped to mobile header only)
      this.elements.burger = this.elements.header.querySelector('.mobile-burger');
      this.elements.logo = this.elements.header.querySelector('.mobile-logo');
      this.elements.search = this.elements.header.querySelector('.mobile-search');
      this.elements.cart = this.elements.header.querySelector('.mobile-cart');

      // Phase 2: Cache drawer elements
      this.elements.overlay = document.querySelector('.mobile-nav-overlay');
      this.elements.drawer = document.querySelector('.mobile-nav-drawer');
      this.elements.drawerContent = document.querySelector('.mobile-nav-content');

      // Phase 2: Initialize drawer if elements exist
      if (this.elements.drawer && this.elements.drawerContent) {
        this.initMegaMenuClone();
      }

      // Phase 2: Bind all event handlers
      this.bindEvents();

      this.state.isInitialized = true;

      console.log('[MobileHeader] Initialized successfully', {
        header: !!this.elements.header,
        burger: !!this.elements.burger,
        logo: !!this.elements.logo,
        search: !!this.elements.search,
        cart: !!this.elements.cart,
        overlay: !!this.elements.overlay,
        drawer: !!this.elements.drawer,
        drawerContent: !!this.elements.drawerContent
      });

      // Phase 6: Bind resize/orientation handlers
      this.bindResizeHandler();
    },

    /**
     * Phase 2: Bind all event handlers
     */
    bindEvents: function() {
      var self = this;

      // Burger click → toggle drawer
      if (this.elements.burger) {
        this.elements.burger.addEventListener('click', function(e) {
          e.preventDefault();
          self.toggleDrawer();
        });
      }

      // Overlay click → close drawer
      if (this.elements.overlay) {
        this.elements.overlay.addEventListener('click', function(e) {
          e.preventDefault();
          self.closeDrawer();
        });
      }

      // ESC key → close drawer
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && self.state.isDrawerOpen) {
          self.closeDrawer();
        }
      });

      // Cart button → navigate to cart
      if (this.elements.cart) {
        this.elements.cart.addEventListener('click', function(e) {
          e.preventDefault();
          self.navigateToCart();
        });
      }

      // Search button → navigate to search (Option A from spec)
      if (this.elements.search) {
        this.elements.search.addEventListener('click', function(e) {
          e.preventDefault();
          self.navigateToSearch();
        });
      }

      console.log('[MobileHeader] Events bound');
    },

    /**
     * Phase 6: Bind resize/orientation handler
     */
    bindResizeHandler: function() {
      var self = this;
      
      this.state.resizeHandler = function() {
        // Close drawer if viewport becomes desktop-sized
        if (window.innerWidth > 768 && self.state.isDrawerOpen) {
          self.closeDrawer();
          console.log('[MobileHeader] Drawer closed due to viewport resize');
        }
      };

      window.addEventListener('resize', this.state.resizeHandler);
      window.addEventListener('orientationchange', function() {
        // Delay to let browser settle after orientation change
        setTimeout(function() {
          if (self.state.resizeHandler) {
            self.state.resizeHandler();
          }
          // Force update drawer height if open
          if (self.state.isDrawerOpen && self.elements.drawer) {
            self.elements.drawer.style.height = '';
          }
        }, 150);
      });

      console.log('[MobileHeader] Resize handler bound');
    },

    /**
     * Phase 2: Toggle drawer open/closed
     */
    toggleDrawer: function() {
      if (this.state.isDrawerOpen) {
        this.closeDrawer();
      } else {
        this.openDrawer();
      }
    },

    /**
     * Phase 2: Open the navigation drawer
     */
    openDrawer: function() {
      if (this.state.isDrawerOpen) return;

      // Update state
      this.state.isDrawerOpen = true;

      // Show overlay
      if (this.elements.overlay) {
        this.elements.overlay.removeAttribute('hidden');
        this.elements.overlay.classList.add('is-open');
      }

      // Open drawer
      if (this.elements.drawer) {
        this.elements.drawer.removeAttribute('hidden');
        // Force reflow before adding class for animation
        this.elements.drawer.offsetHeight;
        this.elements.drawer.classList.add('is-open');
      }

      // Update burger aria state
      if (this.elements.burger) {
        this.elements.burger.setAttribute('aria-expanded', 'true');
        this.elements.burger.classList.add('is-open');
      }

      // Phase 6: Lock body scroll with position preservation
      // Use ScrollLock utility if available, fallback to class
      if (window.ScrollLock) {
        window.ScrollLock.lock('mobile-drawer');
      } else {
        // Fallback: Save scroll position and add class
        this.state.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        document.documentElement.style.setProperty('--scroll-position', this.state.scrollPosition);
        document.body.classList.add('mobile-nav-open');
      }
      
      // Additional class for CSS hooks
      document.body.classList.add('mobile-nav-open');

      // Trap focus inside drawer (basic implementation)
      this.trapFocus();

      console.log('[MobileHeader] Drawer opened');
    },

    /**
     * Phase 2: Close the navigation drawer
     */
    closeDrawer: function() {
      if (!this.state.isDrawerOpen) return;

      // Update state
      this.state.isDrawerOpen = false;

      // Close drawer
      if (this.elements.drawer) {
        this.elements.drawer.classList.remove('is-open');
      }

      // Hide overlay
      if (this.elements.overlay) {
        this.elements.overlay.classList.remove('is-open');
      }

      // Update burger aria state
      if (this.elements.burger) {
        this.elements.burger.setAttribute('aria-expanded', 'false');
        this.elements.burger.classList.remove('is-open');
      }

      // Phase 6: Unlock body scroll with position restoration
      if (window.ScrollLock) {
        window.ScrollLock.unlock('mobile-drawer');
      } else {
        // Fallback: Remove class and restore position
        document.body.classList.remove('mobile-nav-open');
        document.documentElement.style.removeProperty('--scroll-position');
        window.scrollTo(0, this.state.scrollPosition);
      }
      
      document.body.classList.remove('mobile-nav-open');

      // Release focus trap
      this.releaseFocus();

      // Hide elements after transition completes
      var self = this;
      setTimeout(function() {
        if (!self.state.isDrawerOpen) {
          if (self.elements.drawer) {
            self.elements.drawer.setAttribute('hidden', '');
          }
          if (self.elements.overlay) {
            self.elements.overlay.setAttribute('hidden', '');
          }
        }
      }, 300); // Match CSS transition duration

      console.log('[MobileHeader] Drawer closed');
    },

    /**
     * Phase 2: Basic focus trapping inside drawer
     */
    trapFocus: function() {
      if (!this.elements.drawer) return;

      // Store previously focused element
      this.previouslyFocused = document.activeElement;

      // Find first focusable element in drawer
      var focusable = this.elements.drawer.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusable.length > 0) {
        focusable[0].focus();
      }
    },

    /**
     * Phase 2: Release focus trap
     */
    releaseFocus: function() {
      // Return focus to previously focused element
      if (this.previouslyFocused && this.previouslyFocused.focus) {
        this.previouslyFocused.focus();
      }
    },

    /**
     * Phase 2: Navigate to cart page
     */
    navigateToCart: function() {
      window.location.href = '/cart.html';
    },

    /**
     * Phase 2: Navigate to search page (Option A)
     */
    navigateToSearch: function() {
      window.location.href = '/search.html';
    },

    /**
     * Phase 2: Clone Mega Menu into mobile drawer (read-only)
     * 
     * This creates a copy of the existing Mega Menu structure
     * and adapts it for mobile touch interaction.
     * 
     * IMPORTANT: We do NOT modify the original Mega Menu.
     * We only clone its DOM and adapt the clone.
     */
    initMegaMenuClone: function() {
      var self = this;

      // Find the existing mega menu in the DOM
      var megaMenu = document.querySelector('.mega-menu');

      if (!megaMenu) {
        console.log('[MobileHeader] No mega menu found to clone, using fallback navigation');
        this.createFallbackNavigation();
        return;
      }

      // Clone the mega menu structure
      var clone = megaMenu.cloneNode(true);

      // Add mobile-specific class to distinguish from desktop
      clone.classList.add('mobile-mega-menu-clone');

      // Remove any desktop-specific inline event handlers
      this.sanitizeClone(clone);

      // Convert hover behaviors to click-based toggles
      this.convertToClickBehavior(clone);

      // Append to mobile drawer content
      this.elements.drawerContent.appendChild(clone);

      console.log('[MobileHeader] Mega menu cloned into mobile drawer');
    },

    /**
     * Phase 2: Sanitize cloned mega menu
     * Removes inline handlers and desktop-specific attributes
     */
    sanitizeClone: function(clone) {
      // Remove inline onclick, onmouseover, etc.
      var allElements = clone.querySelectorAll('*');
      
      allElements.forEach(function(el) {
        // Remove inline event handlers
        el.removeAttribute('onmouseover');
        el.removeAttribute('onmouseout');
        el.removeAttribute('onmouseenter');
        el.removeAttribute('onmouseleave');
        el.removeAttribute('onfocus');
        el.removeAttribute('onblur');
        
        // Remove any desktop-specific data attributes that might trigger JS
        // (keeping data-* that might be needed for content)
      });
    },

    /**
     * Phase 2: Convert hover-based mega menu to click-based for mobile
     */
    convertToClickBehavior: function(clone) {
      var self = this;

      // Find category items that have subcategories
      var categoryItems = clone.querySelectorAll('.mega-menu__categories > *');

      categoryItems.forEach(function(item) {
        // Check if this item has subcategories
        var hasSubcategories = item.querySelector('.mega-menu__subcategories') || 
                               item.nextElementSibling && 
                               item.nextElementSibling.classList.contains('mega-menu__subcategories');

        if (hasSubcategories || item.children.length > 0) {
          // Add click handler to toggle subcategories
          item.addEventListener('click', function(e) {
            // Only prevent default if there are subcategories to show
            var subcategories = this.querySelector('.mega-menu__subcategories') ||
                               this.querySelector('ul') ||
                               this.querySelector('[class*="sub"]');
            
            if (subcategories) {
              e.preventDefault();
              e.stopPropagation();
              
              // Toggle active state
              var isActive = this.classList.contains('mobile-nav-active');
              
              // Close other open items at same level
              var siblings = this.parentElement.children;
              for (var i = 0; i < siblings.length; i++) {
                siblings[i].classList.remove('mobile-nav-active');
              }
              
              // Toggle this item
              if (!isActive) {
                this.classList.add('mobile-nav-active');
              }
            }
          });
        }
      });

      // Handle any links inside the cloned menu
      var links = clone.querySelectorAll('a');
      links.forEach(function(link) {
        link.addEventListener('click', function(e) {
          // Allow navigation, but close drawer first
          self.closeDrawer();
          // Let the default link behavior happen
        });
      });
    },

    /**
     * Phase 2: Create fallback navigation if no mega menu exists
     */
    createFallbackNavigation: function() {
      if (!this.elements.drawerContent) return;

      var fallbackNav = document.createElement('nav');
      fallbackNav.className = 'mobile-nav-fallback';
      fallbackNav.innerHTML = 
        '<ul class="mobile-nav-list">' +
          '<li><a href="/">Home</a></li>' +
          '<li><a href="/catalog.html">Catalog</a></li>' +
          '<li><a href="/cart.html">Cart</a></li>' +
          '<li><a href="/cabinet/">Account</a></li>' +
        '</ul>';

      this.elements.drawerContent.appendChild(fallbackNav);

      console.log('[MobileHeader] Fallback navigation created');
    }

  };

  /**
   * Initialize on DOM ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      MobileHeader.init();
    });
  } else {
    MobileHeader.init();
  }

  // Expose for debugging (optional, remove in production)
  window.MobileHeader = MobileHeader;

})();

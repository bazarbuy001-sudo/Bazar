/**
 * dataStore-errorHandling.js
 * 
 * Phase 5A: Error Handling Extension for CatalogDataStore
 * 
 * This file DECORATES the existing CatalogDataStore.
 * It does NOT replace it.
 * 
 * ARCHITECTURE RULES:
 * - Does NOT redefine CatalogDataStore
 * - Wraps existing loadProducts method
 * - Preserves original API
 * - Uses existing PRODUCTS_URL if defined
 * - Emits catalog:error event on failure
 * 
 * LOAD ORDER:
 * 1. dataStore.js (original)
 * 2. dataStore-errorHandling.js (this file)
 */

(function() {
  'use strict';

  /**
   * Phase 5A: Configuration
   */
  var CONFIG = {
    TIMEOUT_MS: 10000,        // 10 second timeout
    MAX_RETRIES: 3,           // Maximum retry attempts
    RETRY_DELAY_MS: 1000      // Delay between retries (1 second)
  };

  /**
   * Wait for CatalogDataStore to be available
   */
  function waitForDataStore(callback, maxAttempts) {
    var attempts = 0;
    maxAttempts = maxAttempts || 50;

    function check() {
      attempts++;
      if (window.CatalogDataStore) {
        callback(window.CatalogDataStore);
      } else if (attempts < maxAttempts) {
        setTimeout(check, 100);
      } else {
        console.error('[DataStoreErrorHandling] CatalogDataStore not found after ' + maxAttempts + ' attempts');
      }
    }

    check();
  }

  /**
   * Apply error handling decoration to CatalogDataStore
   */
  function applyErrorHandling(DataStore) {
    
    // Skip if already decorated
    if (DataStore._errorHandlingApplied) {
      console.log('[DataStoreErrorHandling] Already applied, skipping');
      return;
    }

    console.log('[DataStoreErrorHandling] Applying error handling to CatalogDataStore');

    /**
     * Store reference to original loadProducts method
     */
    var originalLoadProducts = DataStore.loadProducts;

    /**
     * Add new state properties (non-destructive)
     */
    DataStore._errorHandlingApplied = true;
    DataStore._retryCount = 0;
    DataStore._lastError = null;
    DataStore._isRetrying = false;

    /**
     * Get products URL from existing config or use default
     * Respects existing architecture
     */
    function getProductsURL() {
      // Check if DataStore has configured URL
      if (DataStore.PRODUCTS_URL) {
        return DataStore.PRODUCTS_URL;
      }
      // Check for config object
      if (DataStore.config && DataStore.config.productsUrl) {
        return DataStore.config.productsUrl;
      }
      // Check for source configuration
      if (DataStore._source && DataStore._source.url) {
        return DataStore._source.url;
      }
      // Default path (project standard)
      return '/data/products.json';
    }

    /**
     * Fetch with timeout wrapper
     */
    function fetchWithTimeout(url, timeout) {
      return new Promise(function(resolve, reject) {
        var controller;
        var timeoutId;

        // Use AbortController if available
        if (typeof AbortController !== 'undefined') {
          controller = new AbortController();
          timeoutId = setTimeout(function() {
            controller.abort();
            reject(new Error('Request timeout after ' + timeout + 'ms'));
          }, timeout);

          fetch(url, { signal: controller.signal })
            .then(function(response) {
              clearTimeout(timeoutId);
              resolve(response);
            })
            .catch(function(error) {
              clearTimeout(timeoutId);
              reject(error);
            });
        } else {
          // Fallback for older browsers
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.timeout = timeout;

          xhr.onload = function() {
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              statusText: xhr.statusText,
              json: function() {
                return Promise.resolve(JSON.parse(xhr.responseText));
              }
            });
          };

          xhr.onerror = function() {
            reject(new Error('Network error'));
          };

          xhr.ontimeout = function() {
            reject(new Error('Request timeout after ' + timeout + 'ms'));
          };

          xhr.send();
        }
      });
    }

    /**
     * Emit error event via EventBus
     */
    function emitError(error) {
      DataStore._lastError = error;

      if (window.CatalogEventBus && typeof window.CatalogEventBus.emit === 'function') {
        window.CatalogEventBus.emit('catalog:error', {
          error: error,
          message: error.message,
          retryCount: DataStore._retryCount,
          timestamp: Date.now()
        });
      }
    }

    /**
     * Load with retry logic
     */
    function loadWithRetry(url) {
      return new Promise(function(resolve, reject) {

        function attemptLoad() {
          DataStore._retryCount++;
          console.log('[DataStoreErrorHandling] Loading attempt ' + DataStore._retryCount + '/' + CONFIG.MAX_RETRIES);

          fetchWithTimeout(url, CONFIG.TIMEOUT_MS)
            .then(function(response) {
              // Check response.ok
              if (!response.ok) {
                throw new Error('HTTP error: ' + response.status + ' ' + response.statusText);
              }
              return response.json();
            })
            .then(function(data) {
              // Reset retry count on success
              DataStore._retryCount = 0;
              DataStore._lastError = null;
              DataStore._isRetrying = false;
              resolve(data);
            })
            .catch(function(error) {
              console.warn('[DataStoreErrorHandling] Attempt ' + DataStore._retryCount + ' failed:', error.message);

              // Retry if under max attempts
              if (DataStore._retryCount < CONFIG.MAX_RETRIES) {
                console.log('[DataStoreErrorHandling] Retrying in ' + CONFIG.RETRY_DELAY_MS + 'ms...');
                DataStore._isRetrying = true;
                setTimeout(attemptLoad, CONFIG.RETRY_DELAY_MS);
              } else {
                DataStore._isRetrying = false;
                var finalError = new Error('Failed to load catalog after ' + CONFIG.MAX_RETRIES + ' attempts: ' + error.message);
                emitError(finalError);
                reject(finalError);
              }
            });
        }

        attemptLoad();
      });
    }

    /**
     * Decorated loadProducts method
     * Wraps original with error handling
     */
    DataStore.loadProducts = function() {
      var self = this;

      // Reset state
      this._retryCount = 0;
      this._lastError = null;

      // If original method exists and is a function, try it first
      if (typeof originalLoadProducts === 'function') {
        // Try original method with error handling wrapper
        return new Promise(function(resolve, reject) {
          try {
            var result = originalLoadProducts.call(self);

            // If original returns a promise
            if (result && typeof result.then === 'function') {
              result
                .then(resolve)
                .catch(function(error) {
                  console.warn('[DataStoreErrorHandling] Original loader failed, using fallback with retry');
                  // Fallback to retry logic
                  loadWithRetry(getProductsURL())
                    .then(resolve)
                    .catch(reject);
                });
            } else {
              // Original returned synchronously
              resolve(result);
            }
          } catch (error) {
            console.warn('[DataStoreErrorHandling] Original loader threw error, using fallback with retry');
            // Fallback to retry logic
            loadWithRetry(getProductsURL())
              .then(resolve)
              .catch(reject);
          }
        });
      } else {
        // No original method, use retry logic directly
        return loadWithRetry(getProductsURL());
      }
    };

    /**
     * Add retry method for manual retry from UI
     */
    DataStore.retry = function() {
      console.log('[DataStoreErrorHandling] Manual retry triggered');
      this._retryCount = 0;
      this._lastError = null;
      return this.loadProducts();
    };

    /**
     * Add error state getters
     */
    DataStore.getLastError = function() {
      return this._lastError;
    };

    DataStore.isRetrying = function() {
      return this._isRetrying;
    };

    DataStore.getRetryCount = function() {
      return this._retryCount;
    };

    console.log('[DataStoreErrorHandling] Error handling applied successfully');
  }

  /**
   * Initialize when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      waitForDataStore(applyErrorHandling);
    });
  } else {
    waitForDataStore(applyErrorHandling);
  }

})();


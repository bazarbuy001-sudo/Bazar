/**
 * WordPressRESTSource - WordPress/WooCommerce REST API data source
 * 
 * Implements the same interface as LocalJSONSource for seamless integration.
 * Transforms WooCommerce product data to frontend-expected format.
 * 
 * IMPORTANT: This is a READ-ONLY data source. No server-side filtering.
 * All filtering, sorting, and pagination logic remains in frontend JS.
 * 
 * @version 1.0.0
 */
const WordPressRESTSource = (function () {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  let _cache = null;
  let _config = {
    baseURL: '/wp-json/wc/v3',
    productsEndpoint: '/products',
    perPage: 100, // Max products per page
    consumerKey: '', // Set via configure()
    consumerSecret: '' // Set via configure()
  };

  // ============================================
  // ATTRIBUTE VALUE MAPPING
  // ============================================

  /**
   * Mapping: WordPress attribute slugs → Frontend display names
   * This ensures exact compatibility with existing frontend code.
   */
  const ATTRIBUTE_MAPPINGS = {
    // Fabric type slugs → Category names (for display and fallback)
    fabric_type: {
      'len': 'Лён',
      'hlopok': 'Хлопок',
      'polulen': 'Полулён',
      'viskoza': 'Вискоза',
      'shelk': 'Шёлк',
      'sherst': 'Шерсть',
      'sintetika': 'Синтетика',
      'velyur': 'Велюр',
      'gabardin': 'Габардин',
      'organza': 'Органза'
    }
  };

  /**
   * Get display name for fabric type slug
   * @param {string} slug - Fabric type slug (e.g., 'len')
   * @returns {string} Display name (e.g., 'Лён')
   */
  function getFabricTypeDisplayName(slug) {
    return ATTRIBUTE_MAPPINGS.fabric_type[slug] || slug;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Configure the data source
   * @param {Object} config - Configuration object
   */
  function configure(config) {
    _config = { ..._config, ...config };
  }

  /**
   * Load products from WordPress REST API
   * @param {string|Object} source - URL or config object
   * @returns {Promise<void>}
   */
  async function loadProducts(source) {
    // If already cached, don't reload
    if (_cache !== null) {
      return;
    }

    try {
      // Determine endpoint URL
      const url = typeof source === 'string'
        ? source
        : `${_config.baseURL}${_config.productsEndpoint}`;

      // Fetch all products (handle pagination)
      const wcProducts = await fetchAllProducts(url);

      // Transform WooCommerce data to frontend format
      _cache = wcProducts.map(transformProduct);

      console.log(`[WordPressRESTSource] Loaded ${_cache.length} products from WordPress`);
    } catch (error) {
      console.error('[WordPressRESTSource] Failed to load products:', error);
      throw error;
    }
  }

  /**
   * Get all products
   * @returns {Array} Array of products in frontend format
   */
  function getAllProducts() {
    return _cache || [];
  }

  /**
   * Get product by ID
   * @param {string|number} productId - Product ID
   * @returns {Object|null} Product object or null
   */
  function getProductById(productId) {
    if (!_cache) return null;

    const id = parseInt(productId);
    return _cache.find(p => p.id === id || p.id === String(productId)) || null;
  }

  // ============================================
  // INTERNAL FUNCTIONS
  // ============================================

  /**
   * Fetch all products with pagination handling
   * @private
   * @param {string} url - Base URL
   * @returns {Promise<Array>} All products from all pages
   */
  async function fetchAllProducts(url) {
    let allProducts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const pageUrl = `${url}?per_page=${_config.perPage}&page=${page}`;

      // Add authentication if configured
      const headers = {};
      if (_config.consumerKey && _config.consumerSecret) {
        const auth = btoa(`${_config.consumerKey}:${_config.consumerSecret}`);
        headers['Authorization'] = `Basic ${auth}`;
      }

      const response = await fetch(pageUrl, { headers });

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
      }

      const products = await response.json();
      allProducts = allProducts.concat(products);

      // Check if there are more pages
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;
    }

    return allProducts;
  }

  /**
   * Transform WooCommerce product to frontend format
   * @private
   * @param {Object} wcProduct - WooCommerce product object
   * @returns {Object} Frontend-formatted product
   */
  function transformProduct(wcProduct) {
    // Extract attributes into a map for easy access
    const attributesMap = {};
    if (Array.isArray(wcProduct.attributes)) {
      wcProduct.attributes.forEach(attr => {
        attributesMap[attr.slug] = attr.options || [];
      });
    }

    // Extract custom meta fields
    const customMeta = wcProduct.custom_meta || {};

    // Get fabric_type slug (first value from attribute)
    const fabricTypeSlug = attributesMap.fabric_type?.[0] || '';

    // Get category name (use fabric type display name as fallback)
    const categoryName = wcProduct.categories?.[0]?.name || getFabricTypeDisplayName(fabricTypeSlug);

    // Determine price (null if price_on_request is true)
    const priceOnRequest = customMeta._price_on_request === true;
    const price = priceOnRequest ? null : parseFloat(wcProduct.price) || null;

    // Get image URL with fallback to placeholder
    let imageUrl = wcProduct.images?.[0]?.src || '';

    // If no image from WordPress, use placeholder
    if (!imageUrl) {
      imageUrl = 'images/placeholder-fabric.jpg'; // Fallback placeholder
      console.warn(`[WordPressRESTSource] Product "${wcProduct.name}" (ID: ${wcProduct.id}) has no image, using placeholder`);
    }

    // Build frontend-formatted product
    return {
      // Core fields
      id: wcProduct.id,
      name: wcProduct.name || '',
      image: imageUrl,
      price: price,
      price_unit: '₽/м',

      // Status flags
      is_new: customMeta._is_new === true,
      is_sale: wcProduct.on_sale === true || customMeta._is_sale === true,
      coming_soon: customMeta._coming_soon === true,
      price_on_request: priceOnRequest,

      // Attributes (arrays of strings)
      colors: attributesMap.color || [],
      composition: attributesMap.composition || [],

      // Fabric type (slug format for filtering)
      fabric_type: fabricTypeSlug,

      // Category (display name for UI)
      category: categoryName,

      // Numeric attributes
      density: attributesMap.density?.[0] ? parseFloat(attributesMap.density[0]) : null,
      fabric_meterage: customMeta._fabric_meterage ? parseFloat(customMeta._fabric_meterage) : null,

      // Status (for cart availability)
      status: customMeta._fabric_status || 'in_stock'
    };
  }

  // ============================================
  // EXPORT
  // ============================================

  return {
    configure,
    loadProducts,
    getAllProducts,
    getProductById
  };
})();

// Export to global scope
if (typeof window !== 'undefined') {
  window.WordPressRESTSource = WordPressRESTSource;
}

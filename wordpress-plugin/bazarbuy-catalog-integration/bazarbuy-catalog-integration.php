<?php
/**
 * Plugin Name: Bazar Buy Catalog Integration
 * Plugin URI: https://bazarbuy.com
 * Description: Provides REST API integration for frontend catalog. Registers product attributes and custom meta fields with exact naming to match frontend expectations.
 * Version: 1.0.0
 * Author: Bazar Buy
 * Author URI: https://bazarbuy.com
 * Text Domain: bazarbuy-catalog
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register custom meta fields for WooCommerce products
 * These meta fields must match frontend expectations exactly
 */
add_action('init', 'bazarbuy_register_product_meta_fields');
function bazarbuy_register_product_meta_fields() {
    // Status field: in_stock or in_transit
    register_post_meta('product', '_fabric_status', [
        'type' => 'string',
        'single' => true,
        'show_in_rest' => true,
        'default' => 'in_stock',
        'sanitize_callback' => 'sanitize_text_field',
        'description' => 'Product availability status (in_stock or in_transit)'
    ]);
    
    // Price on request flag
    register_post_meta('product', '_price_on_request', [
        'type' => 'boolean',
        'single' => true,
        'show_in_rest' => true,
        'default' => false,
        'sanitize_callback' => 'rest_sanitize_boolean',
        'description' => 'Whether price should be shown as "Price on request"'
    ]);
    
    // Fabric meterage (available meters)
    register_post_meta('product', '_fabric_meterage', [
        'type' => 'number',
        'single' => true,
        'show_in_rest' => true,
        'sanitize_callback' => 'floatval',
        'description' => 'Available fabric meterage in meters'
    ]);
    
    // New product badge
    register_post_meta('product', '_is_new', [
        'type' => 'boolean',
        'single' => true,
        'show_in_rest' => true,
        'default' => false,
        'sanitize_callback' => 'rest_sanitize_boolean',
        'description' => 'Display "New" badge on product'
    ]);
    
    // Sale badge (in addition to WooCommerce native on_sale)
    register_post_meta('product', '_is_sale', [
        'type' => 'boolean',
        'single' => true,
        'show_in_rest' => true,
        'default' => false,
        'sanitize_callback' => 'rest_sanitize_boolean',
        'description' => 'Display "Sale" badge on product'
    ]);
    
    // Coming soon badge
    register_post_meta('product', '_coming_soon', [
        'type' => 'boolean',
        'single' => true,
        'show_in_rest' => true,
        'default' => false,
        'sanitize_callback' => 'rest_sanitize_boolean',
        'description' => 'Display "Coming Soon" badge on product'
    ]);
}

/**
 * Register product attributes on plugin activation
 * Attributes must have exact slugs to match frontend expectations
 */
register_activation_hook(__FILE__, 'bazarbuy_create_product_attributes');
function bazarbuy_create_product_attributes() {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return;
    }
    
    // Attribute 1: fabric_type (single select)
    $fabric_type_attr = [
        'name' => 'Тип ткани',
        'slug' => 'fabric_type',
        'type' => 'select',
        'order_by' => 'menu_order',
        'has_archives' => false
    ];
    
    if (!taxonomy_exists('pa_fabric_type')) {
        wc_create_attribute($fabric_type_attr);
    }
    
    // Register taxonomy
    register_taxonomy('pa_fabric_type', ['product'], [
        'labels' => [
            'name' => 'Тип ткани',
            'singular_name' => 'Тип ткани',
        ],
        'hierarchical' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => ['slug' => 'fabric_type'],
    ]);
    
    // Add fabric type terms with exact slugs
    $fabric_types = [
        'len' => 'Лён',
        'hlopok' => 'Хлопок',
        'polulen' => 'Полулён',
        'viskoza' => 'Вискоза',
        'shelk' => 'Шёлк',
        'sherst' => 'Шерсть',
        'sintetika' => 'Синтетика',
        'velyur' => 'Велюр',
        'gabardin' => 'Габардин',
        'organza' => 'Органза'
    ];
    
    foreach ($fabric_types as $slug => $name) {
        if (!term_exists($slug, 'pa_fabric_type')) {
            wp_insert_term($name, 'pa_fabric_type', ['slug' => $slug]);
        }
    }
    
    // Attribute 2: composition (multi-select)
    $composition_attr = [
        'name' => 'Состав',
        'slug' => 'composition',
        'type' => 'select',
        'order_by' => 'menu_order',
        'has_archives' => false
    ];
    
    if (!taxonomy_exists('pa_composition')) {
        wc_create_attribute($composition_attr);
    }
    
    register_taxonomy('pa_composition', ['product'], [
        'labels' => [
            'name' => 'Состав',
            'singular_name' => 'Состав',
        ],
        'hierarchical' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => ['slug' => 'composition'],
    ]);
    
    // Attribute 3: color (multi-select)
    $color_attr = [
        'name' => 'Цвет',
        'slug' => 'color',
        'type' => 'select',
        'order_by' => 'menu_order',
        'has_archives' => false
    ];
    
    if (!taxonomy_exists('pa_color')) {
        wc_create_attribute($color_attr);
    }
    
    register_taxonomy('pa_color', ['product'], [
        'labels' => [
            'name' => 'Цвет',
            'singular_name' => 'Цвет',
        ],
        'hierarchical' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => ['slug' => 'color'],
    ]);
    
    // Add color terms (Russian names as in products.json)
    $colors = [
        'белый' => 'Белый',
        'чёрный' => 'Чёрный',
        'синий' => 'Синий',
        'красный' => 'Красный',
        'бежевый' => 'Бежевый',
        'натуральный' => 'Натуральный',
        'голубой' => 'Голубой',
        'розовый' => 'Розовый',
        'серый' => 'Серый',
        'бордо' => 'Бордо',
        'тёмно-синий' => 'Тёмно-синий',
        'золото' => 'Золото',
        'серебро' => 'Серебро'
    ];
    
    foreach ($colors as $slug => $name) {
        if (!term_exists($slug, 'pa_color')) {
            wp_insert_term($name, 'pa_color', ['slug' => $slug]);
        }
    }
    
    // Attribute 4: density (text/numeric)
    $density_attr = [
        'name' => 'Плотность',
        'slug' => 'density',
        'type' => 'text',
        'order_by' => 'menu_order',
        'has_archives' => false
    ];
    
    if (!taxonomy_exists('pa_density')) {
        wc_create_attribute($density_attr);
    }
    
    register_taxonomy('pa_density', ['product'], [
        'labels' => [
            'name' => 'Плотность',
            'singular_name' => 'Плотность',
        ],
        'hierarchical' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => ['slug' => 'density'],
    ]);
    
    // Flush rewrite rules
    flush_rewrite_rules();
}

/**
 * Expose custom meta fields in WooCommerce REST API
 * This ensures frontend can access all required fields
 */
add_filter('woocommerce_rest_prepare_product_object', 'bazarbuy_add_meta_to_rest_api', 10, 3);
function bazarbuy_add_meta_to_rest_api($response, $product, $request) {
    $product_id = $product->get_id();
    
    // Add custom meta fields to response
    $response->data['custom_meta'] = [
        '_fabric_status' => get_post_meta($product_id, '_fabric_status', true) ?: 'in_stock',
        '_price_on_request' => (bool) get_post_meta($product_id, '_price_on_request', true),
        '_fabric_meterage' => get_post_meta($product_id, '_fabric_meterage', true) ? (float) get_post_meta($product_id, '_fabric_meterage', true) : null,
        '_is_new' => (bool) get_post_meta($product_id, '_is_new', true),
        '_is_sale' => (bool) get_post_meta($product_id, '_is_sale', true),
        '_coming_soon' => (bool) get_post_meta($product_id, '_coming_soon', true)
    ];
    
    return $response;
}

/**
 * Add meta boxes to product edit screen for easy management
 */
add_action('add_meta_boxes', 'bazarbuy_add_product_meta_boxes');
function bazarbuy_add_product_meta_boxes() {
    add_meta_box(
        'bazarbuy_product_meta',
        'Bazar Buy - Дополнительные поля',
        'bazarbuy_product_meta_box_callback',
        'product',
        'side',
        'default'
    );
}

function bazarbuy_product_meta_box_callback($post) {
    // Add nonce for security
    wp_nonce_field('bazarbuy_save_meta', 'bazarbuy_meta_nonce');
    
    // Get current values
    $fabric_status = get_post_meta($post->ID, '_fabric_status', true) ?: 'in_stock';
    $price_on_request = get_post_meta($post->ID, '_price_on_request', true);
    $fabric_meterage = get_post_meta($post->ID, '_fabric_meterage', true);
    $is_new = get_post_meta($post->ID, '_is_new', true);
    $is_sale = get_post_meta($post->ID, '_is_sale', true);
    $coming_soon = get_post_meta($post->ID, '_coming_soon', true);
    
    ?>
    <p>
        <label for="fabric_status"><strong>Статус товара:</strong></label><br>
        <select name="fabric_status" id="fabric_status" style="width: 100%;">
            <option value="in_stock" <?php selected($fabric_status, 'in_stock'); ?>>В наличии</option>
            <option value="in_transit" <?php selected($fabric_status, 'in_transit'); ?>>В пути</option>
        </select>
    </p>
    
    <p>
        <label for="fabric_meterage"><strong>Метраж (м):</strong></label><br>
        <input type="number" name="fabric_meterage" id="fabric_meterage" value="<?php echo esc_attr($fabric_meterage); ?>" step="0.1" style="width: 100%;">
    </p>
    
    <p>
        <label>
            <input type="checkbox" name="price_on_request" value="1" <?php checked($price_on_request, true); ?>>
            <strong>Цена по запросу</strong>
        </label>
    </p>
    
    <p>
        <label>
            <input type="checkbox" name="is_new" value="1" <?php checked($is_new, true); ?>>
            <strong>Новинка</strong>
        </label>
    </p>
    
    <p>
        <label>
            <input type="checkbox" name="is_sale" value="1" <?php checked($is_sale, true); ?>>
            <strong>Распродажа</strong>
        </label>
    </p>
    
    <p>
        <label>
            <input type="checkbox" name="coming_soon" value="1" <?php checked($coming_soon, true); ?>>
            <strong>Скоро в продаже</strong>
        </label>
    </p>
    <?php
}

/**
 * Save meta box data
 */
add_action('save_post_product', 'bazarbuy_save_product_meta');
function bazarbuy_save_product_meta($post_id) {
    // Check nonce
    if (!isset($_POST['bazarbuy_meta_nonce']) || !wp_verify_nonce($_POST['bazarbuy_meta_nonce'], 'bazarbuy_save_meta')) {
        return;
    }
    
    // Check autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    // Check permissions
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    // Save fabric status
    if (isset($_POST['fabric_status'])) {
        update_post_meta($post_id, '_fabric_status', sanitize_text_field($_POST['fabric_status']));
    }
    
    // Save fabric meterage
    if (isset($_POST['fabric_meterage'])) {
        update_post_meta($post_id, '_fabric_meterage', floatval($_POST['fabric_meterage']));
    }
    
    // Save checkboxes
    update_post_meta($post_id, '_price_on_request', isset($_POST['price_on_request']) ? true : false);
    update_post_meta($post_id, '_is_new', isset($_POST['is_new']) ? true : false);
    update_post_meta($post_id, '_is_sale', isset($_POST['is_sale']) ? true : false);
    update_post_meta($post_id, '_coming_soon', isset($_POST['coming_soon']) ? true : false);
}

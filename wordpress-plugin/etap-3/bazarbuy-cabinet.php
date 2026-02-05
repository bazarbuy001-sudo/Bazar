<?php
/**
 * Plugin Name: BazarBuy Cabinet & Chat
 * Plugin URI: https://bazarbuy.store
 * Description: Личный кабинет и система чата для B2B магазина тканей. Полнофункциональная система коммуникаций между клиентами и менеджерами с поддержкой Telegram уведомлений.
 * Version: 3.0.0
 * Author: BazarBuy Team
 * Author URI: https://bazarbuy.store
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: bazarbuy-cabinet
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Network: false
 * 
 * @package Bazarbuy_Cabinet
 * @since 1.0.0
 */

// Блокировка прямого доступа
if (!defined('ABSPATH')) {
    exit('Direct access forbidden.');
}

// ═══════════════════════════════════════════════════════════════════════════
// КОНСТАНТЫ ПЛАГИНА
// ═══════════════════════════════════════════════════════════════════════════

define('BAZARBUY_CABINET_VERSION', '3.0.0');
define('BAZARBUY_CABINET_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BAZARBUY_CABINET_PLUGIN_URL', plugin_dir_url(__FILE__));
define('BAZARBUY_CABINET_PLUGIN_FILE', __FILE__);

// ═══════════════════════════════════════════════════════════════════════════
// ПРОВЕРКА ЗАВИСИМОСТЕЙ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Проверка минимальных требований
 */
function bazarbuy_cabinet_check_requirements() {
    global $wp_version;
    
    $php_min = '7.4';
    $wp_min = '5.8';
    
    $errors = [];
    
    // Проверка версии PHP
    if (version_compare(PHP_VERSION, $php_min, '<')) {
        $errors[] = sprintf(
            'BazarBuy Cabinet требует PHP %s или выше. Текущая версия: %s',
            $php_min,
            PHP_VERSION
        );
    }
    
    // Проверка версии WordPress
    if (version_compare($wp_version, $wp_min, '<')) {
        $errors[] = sprintf(
            'BazarBuy Cabinet требует WordPress %s или выше. Текущая версия: %s',
            $wp_min,
            $wp_version
        );
    }
    
    // Проверка JWT Secret
    if (!defined('BAZARBUY_JWT_SECRET')) {
        $errors[] = 'BAZARBUY_JWT_SECRET не определен в wp-config.php. Добавьте: define(\'BAZARBUY_JWT_SECRET\', \'...\');';
    }
    
    if (!empty($errors)) {
        add_action('admin_notices', function() use ($errors) {
            foreach ($errors as $error) {
                echo '<div class="notice notice-error"><p><strong>BazarBuy Cabinet:</strong> ' . esc_html($error) . '</p></div>';
            }
        });
        return false;
    }
    
    return true;
}

// Проверка при загрузке плагина
if (!bazarbuy_cabinet_check_requirements()) {
    return;
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОДКЛЮЧЕНИЕ ВСЕХ КОНТРОЛЛЕРОВ И КЛАССОВ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Загрузить файл контроллера с проверкой существования
 */
function bazarbuy_cabinet_load_file($relative_path) {
    $full_path = BAZARBUY_CABINET_PLUGIN_DIR . $relative_path;
    
    if (file_exists($full_path)) {
        require_once $full_path;
        return true;
    } else {
        error_log(sprintf(
            '[BazarBuy Cabinet] Missing file: %s (expected at: %s)',
            basename($relative_path),
            $full_path
        ));
        return false;
    }
}

// Список файлов для загрузки (в порядке зависимостей)
$required_files = [
    // Абстракция БД (должна быть первой, т.к. используется контроллерами)
    'includes/db/class-chat-db.php',
    
    // Базовые контроллеры (ЭТАП 1, 2, 3)
    'includes/api/class-auth-controller.php',
    'includes/api/class-user-controller.php',
    'includes/api/class-chat-controller.php',
    'includes/api/class-telegram-controller.php',
    
    // Расширенные контроллеры (Фазы 2, 3)
    'includes/api/class-admin-chat-controller.php',
    'includes/api/class-telegram-webhook-controller.php',
    
    // Система ролей (опционально, если существует)
    'includes/roles/class-roles-manager.php',
];

$loaded_count = 0;
foreach ($required_files as $file) {
    if (bazarbuy_cabinet_load_file($file)) {
        $loaded_count++;
    }
}

// Логирование успешной загрузки
if (defined('WP_DEBUG') && WP_DEBUG) {
    error_log(sprintf(
        '[BazarBuy Cabinet] Loaded %d/%d required files',
        $loaded_count,
        count($required_files)
    ));
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕГИСТРАЦИЯ REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'bazarbuy_cabinet_register_routes', 10);

function bazarbuy_cabinet_register_routes() {
    $controllers = [];
    
    // ЭТАП 1: Аутентификация
    if (class_exists('Bazarbuy_Auth_Controller')) {
        $controllers[] = new Bazarbuy_Auth_Controller();
    }
    
    // ЭТАП 2: Профиль пользователя
    if (class_exists('Bazarbuy_User_Controller')) {
        $controllers[] = new Bazarbuy_User_Controller();
    }
    
    // ЭТАП 3: Чат и уведомления
    if (class_exists('Bazarbuy_Chat_Controller')) {
        $controllers[] = new Bazarbuy_Chat_Controller();
    }
    
    if (class_exists('Bazarbuy_Telegram_Controller')) {
        $controllers[] = new Bazarbuy_Telegram_Controller();
    }
    
    // Фаза 2: Админ-чат
    if (class_exists('Bazarbuy_Admin_Chat_Controller')) {
        $controllers[] = new Bazarbuy_Admin_Chat_Controller();
    }
    
    // Фаза 3: Telegram Webhook
    if (class_exists('Bazarbuy_Telegram_Webhook_Controller')) {
        $controllers[] = new Bazarbuy_Telegram_Webhook_Controller();
    }
    
    // Регистрация всех доступных контроллеров
    foreach ($controllers as $controller) {
        if (method_exists($controller, 'register_routes')) {
            $controller->register_routes();
        }
    }
    
    // Логирование для отладки
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log(sprintf(
            '[BazarBuy Cabinet] Registered %d REST API controllers',
            count($controllers)
        ));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// СОЗДАНИЕ СТРАНИЦЫ АДМИН-ЧАТА В WORDPRESS
// ═══════════════════════════════════════════════════════════════════════════

add_action('admin_menu', 'bazarbuy_cabinet_admin_menu');

function bazarbuy_cabinet_admin_menu() {
    add_menu_page(
        __('💬 Чат BazarBuy', 'bazarbuy-cabinet'),
        __('BazarBuy Чат', 'bazarbuy-cabinet'),
        'manage_options',
        'bazarbuy-chat',
        'bazarbuy_cabinet_render_chat_page',
        'dashicons-format-chat',
        30
    );
}

/**
 * Отображение страницы админ-чата
 */
function bazarbuy_cabinet_render_chat_page() {
    // Проверка прав доступа
    if (!current_user_can('manage_options')) {
        wp_die(__('У вас недостаточно прав для доступа к этой странице.', 'bazarbuy-cabinet'));
    }
    
    $api_base = rest_url('cabinet/v1/admin/chat');
    $nonce = wp_create_nonce('wp_rest');
    $current_user = wp_get_current_user();
    
    ?>
    <div class="wrap">
        <h1><?php _e('💬 Чат с клиентами BazarBuy', 'bazarbuy-cabinet'); ?></h1>
        
        <div class="notice notice-info" style="margin-top: 20px;">
            <p>
                <?php _e('Здесь вы можете общаться с клиентами в реальном времени. Сообщения обновляются автоматически.', 'bazarbuy-cabinet'); ?>
            </p>
        </div>
        
        <div id="bazarbuy-chat-app">
            <div style="padding: 40px; text-align: center; color: #666;">
                <p><?php _e('Загрузка чата...', 'bazarbuy-cabinet'); ?></p>
                <span class="spinner is-active" style="float: none; margin: 0;"></span>
            </div>
        </div>
    </div>
    
    <style>
        /* Базовые стили для админ-чата */
        #bazarbuy-chat-app {
            margin-top: 20px;
            min-height: 600px;
        }
        .bazarbuy-admin-chat {
            display: flex;
            height: calc(100vh - 250px);
            min-height: 600px;
            border: 1px solid #ccd0d4;
            border-radius: 4px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 1px 1px rgba(0,0,0,.04);
        }
        .chat-sidebar {
            width: 320px;
            border-right: 1px solid #ccd0d4;
            overflow-y: auto;
            background: #f9f9f9;
        }
        .chat-sidebar h3 {
            padding: 15px;
            margin: 0;
            border-bottom: 1px solid #ccd0d4;
            background: #fff;
        }
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .chat-header {
            padding: 15px;
            border-bottom: 1px solid #ccd0d4;
            background: #fff;
        }
        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            background: #fff;
        }
        .chat-input-form {
            padding: 15px;
            border-top: 1px solid #ccd0d4;
            background: #fff;
        }
    </style>
    
    <script>
        // Конфигурация для админ-чата
        window.bazarbuyChatConfig = {
            apiBase: <?php echo json_encode($api_base); ?>,
            nonce: <?php echo json_encode($nonce); ?>,
            currentUser: <?php echo json_encode($current_user->display_name); ?>,
            strings: {
                loading: <?php echo json_encode(__('Загрузка...', 'bazarbuy-cabinet')); ?>,
                send: <?php echo json_encode(__('Отправить', 'bazarbuy-cabinet')); ?>,
                typeMessage: <?php echo json_encode(__('Введите сообщение...', 'bazarbuy-cabinet')); ?>,
                noThreads: <?php echo json_encode(__('Нет активных диалогов', 'bazarbuy-cabinet')); ?>,
                selectThread: <?php echo json_encode(__('Выберите диалог для начала общения', 'bazarbuy-cabinet')); ?>
            }
        };
    </script>
    
    <script src="<?php echo esc_url(BAZARBUY_CABINET_PLUGIN_URL . 'admin-ui/admin-chat.js'); ?>"></script>
    <?php
}

// ═══════════════════════════════════════════════════════════════════════════
// АКТИВАЦИЯ ПЛАГИНА
// ═══════════════════════════════════════════════════════════════════════════

register_activation_hook(__FILE__, 'bazarbuy_cabinet_activate');

function bazarbuy_cabinet_activate() {
    // Сброс постоянных ссылок для регистрации REST API
    flush_rewrite_rules();
    
    // Регистрация ролей (если класс существует)
    if (class_exists('Bazarbuy_Roles_Manager')) {
        Bazarbuy_Roles_Manager::register_roles();
    }
    
    // Создание таблиц БД (если используется БД режим)
    if (defined('BAZARBUY_CHAT_USE_DB') && BAZARBUY_CHAT_USE_DB) {
        bazarbuy_cabinet_create_tables();
    }
    
    // Логирование активации
    error_log(sprintf(
        '[BazarBuy Cabinet] Plugin activated. Version: %s',
        BAZARBUY_CABINET_VERSION
    ));
}

/**
 * Создание таблиц в БД
 */
function bazarbuy_cabinet_create_tables() {
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    $table_name = $wpdb->prefix . 'bazarbuy_chat_messages';
    
    // Проверка существования таблицы
    if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") === $table_name) {
        error_log('[BazarBuy Cabinet] Table already exists: ' . $table_name);
        return;
    }
    
    // SQL для создания таблицы
    $sql = "CREATE TABLE {$table_name} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        order_id BIGINT UNSIGNED NULL DEFAULT NULL,
        sender ENUM('client', 'manager', 'system') NOT NULL DEFAULT 'client',
        message TEXT NOT NULL,
        status ENUM('pending', 'sent', 'delivered', 'failed', 'read') NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_user_id (user_id),
        INDEX idx_order_id (order_id),
        INDEX idx_created_at (created_at),
        INDEX idx_sender (sender),
        INDEX idx_status (status)
    ) {$charset_collate};";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    
    error_log('[BazarBuy Cabinet] Table created: ' . $table_name);
}

// ═══════════════════════════════════════════════════════════════════════════
// ДЕАКТИВАЦИЯ ПЛАГИНА
// ═══════════════════════════════════════════════════════════════════════════

register_deactivation_hook(__FILE__, 'bazarbuy_cabinet_deactivate');

function bazarbuy_cabinet_deactivate() {
    // Сброс постоянных ссылок
    flush_rewrite_rules();
    
    // Очистка transients (опционально)
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_bazarbuy_chat_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_bazarbuy_chat_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_bazarbuy_chat_rate_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_bazarbuy_chat_rate_%'");
    
    // Логирование деактивации
    error_log('[BazarBuy Cabinet] Plugin deactivated.');
}

// ═══════════════════════════════════════════════════════════════════════════
// УДАЛЕНИЕ ПЛАГИНА (ОПЦИОНАЛЬНО)
// ═══════════════════════════════════════════════════════════════════════════

register_uninstall_hook(__FILE__, 'bazarbuy_cabinet_uninstall');

function bazarbuy_cabinet_uninstall() {
    // Внимание: Этот код выполнится при удалении плагина!
    // Раскомментируйте только если нужно удалять данные при удалении
    
    // Удаление таблиц (опционально)
    // global $wpdb;
    // $wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}bazarbuy_chat_messages");
    // $wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}bazarbuy_chat_threads");
    // $wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}bazarbuy_chat_reads");
    
    // Удаление опций (опционально)
    // delete_option('bazarbuy_cabinet_settings');
    
    // Удаление ролей (опционально)
    // if (class_exists('Bazarbuy_Roles_Manager')) {
    //     Bazarbuy_Roles_Manager::unregister_roles();
    // }
    
    error_log('[BazarBuy Cabinet] Plugin uninstalled.');
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN NOTICES (опционально)
// ═══════════════════════════════════════════════════════════════════════════

add_action('admin_notices', 'bazarbuy_cabinet_admin_notices');

function bazarbuy_cabinet_admin_notices() {
    // Проверка конфигурации
    $warnings = [];
    
    if (!defined('BAZARBUY_JWT_SECRET')) {
        $warnings[] = __('JWT Secret не настроен. Добавьте BAZARBUY_JWT_SECRET в wp-config.php', 'bazarbuy-cabinet');
    }
    
    // Если используется production режим, проверить настройки
    if (defined('BAZARBUY_CHAT_USE_DB') && BAZARBUY_CHAT_USE_DB) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'bazarbuy_chat_messages';
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") !== $table_name) {
            $warnings[] = __('Таблица чата не создана. Выполните миграцию БД.', 'bazarbuy-cabinet');
        }
    }
    
    if (defined('BAZARBUY_TELEGRAM_ENABLED') && BAZARBUY_TELEGRAM_ENABLED) {
        if (!defined('BAZARBUY_TELEGRAM_BOT_TOKEN') || !BAZARBUY_TELEGRAM_BOT_TOKEN) {
            $warnings[] = __('Telegram Bot Token не настроен. Telegram уведомления не будут работать.', 'bazarbuy-cabinet');
        }
    }
    
    if (!empty($warnings)) {
        foreach ($warnings as $warning) {
            echo '<div class="notice notice-warning is-dismissible"><p><strong>BazarBuy Cabinet:</strong> ' . esc_html($warning) . '</p></div>';
        }
    }
}



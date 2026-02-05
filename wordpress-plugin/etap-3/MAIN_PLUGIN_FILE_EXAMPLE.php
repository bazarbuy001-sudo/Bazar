<?php
/**
 * Plugin Name: BazarBuy Cabinet
 * Plugin URI: https://bazarbuy.store
 * Description: Личный кабинет BazarBuy с чатом и коммуникациями между клиентами и менеджерами
 * Version: 3.0.0
 * Author: BazarBuy
 * Author URI: https://bazarbuy.store
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: bazarbuy-cabinet
 * Domain Path: /languages
 * 
 * Требования:
 * - WordPress 5.0+
 * - PHP 7.4+
 */

// Предотвращение прямого доступа
if (!defined('ABSPATH')) {
    exit;
}

// Версия плагина
define('BAZARBUY_CABINET_VERSION', '3.0.0');

// Путь к плагину
define('BAZARBUY_CABINET_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BAZARBUY_CABINET_PLUGIN_URL', plugin_dir_url(__FILE__));

// ═══════════════════════════════════════════════════════════════════════════
// ПОДКЛЮЧЕНИЕ ВСЕХ КОНТРОЛЛЕРОВ
// ═══════════════════════════════════════════════════════════════════════════

// Проверка существования необходимых классов (опционально)
if (!class_exists('Bazarbuy_Response')) {
    // Если класс Bazarbuy_Response находится в отдельном файле, подключите его здесь
    // require_once BAZARBUY_CABINET_PLUGIN_DIR . 'includes/class-response.php';
}

// ЭТАП 1: Безопасность и аутентификация
require_once BAZARBUY_CABINET_PLUGIN_DIR . 'includes/api/class-auth-controller.php';

// ЭТАП 2: Профиль пользователя
require_once BAZARBUY_CABINET_PLUGIN_DIR . 'includes/api/class-user-controller.php';

// ЭТАП 3: Чат и уведомления
require_once BAZARBUY_CABINET_PLUGIN_DIR . 'includes/db/class-chat-db.php';
require_once BAZARBUY_CABINET_PLUGIN_DIR . 'includes/api/class-chat-controller.php';
require_once BAZARBUY_CABINET_PLUGIN_DIR . 'includes/api/class-telegram-controller.php';

// Фаза 2: Админ-чат для менеджеров
require_once BAZARBUY_CABINET_PLUGIN_DIR . 'includes/api/class-admin-chat-controller.php';

// Фаза 3: Telegram Webhook (двусторонний мост)
require_once BAZARBUY_CABINET_PLUGIN_DIR . 'includes/api/class-telegram-webhook-controller.php';

// ═══════════════════════════════════════════════════════════════════════════
// РЕГИСТРАЦИЯ REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'bazarbuy_cabinet_register_routes');

function bazarbuy_cabinet_register_routes() {
    // ЭТАП 1: Аутентификация
    $auth_controller = new Bazarbuy_Auth_Controller();
    $auth_controller->register_routes();
    
    // ЭТАП 2: Профиль пользователя
    $user_controller = new Bazarbuy_User_Controller();
    $user_controller->register_routes();
    
    // ЭТАП 3: Чат и уведомления
    $chat_controller = new Bazarbuy_Chat_Controller();
    $telegram_controller = new Bazarbuy_Telegram_Controller();
    
    $chat_controller->register_routes();
    $telegram_controller->register_routes();
    
    // Фаза 2: Админ-чат для менеджеров
    $admin_chat_controller = new Bazarbuy_Admin_Chat_Controller();
    $admin_chat_controller->register_routes();
    
    // Фаза 3: Telegram Webhook
    $telegram_webhook_controller = new Bazarbuy_Telegram_Webhook_Controller();
    $telegram_webhook_controller->register_routes();
}

// ═══════════════════════════════════════════════════════════════════════════
// СОЗДАНИЕ СТРАНИЦЫ АДМИН-ЧАТА В WORDPRESS
// ═══════════════════════════════════════════════════════════════════════════

add_action('admin_menu', 'bazarbuy_cabinet_admin_menu');

function bazarbuy_cabinet_admin_menu() {
    add_menu_page(
        'Чат с клиентами BazarBuy',          // Заголовок страницы
        'BazarBuy Чат',                      // Название в меню
        'manage_options',                    // Права доступа (только администраторы)
        'bazarbuy-chat',                     // Slug страницы
        'bazarbuy_cabinet_chat_page',        // Функция отображения
        'dashicons-format-chat',             // Иконка (WordPress Dashicons)
        30                                   // Позиция в меню
    );
}

/**
 * Функция отображения страницы админ-чата
 */
function bazarbuy_cabinet_chat_page() {
    // Дополнительная проверка прав доступа
    if (!current_user_can('manage_options')) {
        wp_die('У вас нет прав для доступа к этой странице.');
    }
    
    ?>
    <div class="wrap">
        <h1>💬 Чат с клиентами BazarBuy</h1>
        <p class="description">
            Общайтесь с клиентами прямо из WordPress. Сообщения синхронизируются в реальном времени.
        </p>
        <div id="bazarbuy-chat-app"></div>
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
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
            background: #fff;
        }
        .chat-sidebar {
            width: 300px;
            border-right: 1px solid #ddd;
            overflow-y: auto;
            background: #f9f9f9;
        }
        .chat-sidebar h3 {
            padding: 15px;
            margin: 0;
            border-bottom: 1px solid #ddd;
            background: #fff;
        }
        .threads-list {
            padding: 0;
        }
        .thread-item {
            padding: 12px 15px;
            border-bottom: 1px solid #ddd;
            cursor: pointer;
            transition: background 0.2s;
        }
        .thread-item:hover {
            background: #f0f0f0;
        }
        .thread-item.active {
            background: #e3f2fd;
            border-left: 3px solid #2196F3;
        }
        .thread-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        .unread-count {
            background: #f44336;
            color: white;
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: bold;
        }
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .chat-header {
            padding: 15px;
            border-bottom: 1px solid #ddd;
            background: #fff;
        }
        .messages-list {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            background: #fff;
        }
        .message-item {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 4px;
        }
        .message-client {
            background: #f5f5f5;
        }
        .message-manager {
            background: #e3f2fd;
            margin-left: 20%;
        }
        .chat-input-area {
            padding: 15px;
            border-top: 1px solid #ddd;
            background: #fff;
        }
        .chat-input-area textarea {
            width: 100%;
            min-height: 80px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: vertical;
        }
        .chat-input-area button {
            margin-top: 10px;
        }
    </style>
    
    <script>
        // Конфигурация для админ-чата
        window.bazarbuyChatConfig = {
            apiBase: '<?php echo esc_js(rest_url('cabinet/v1/admin/chat')); ?>',
            nonce: '<?php echo esc_js(wp_create_nonce('wp_rest')); ?>'
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
    // Сброс постоянных ссылок для регистрации REST API endpoints
    flush_rewrite_rules();
    
    // Создание необходимых таблиц (если используется БД)
    // Можно вызвать миграцию здесь, если нужно
    // bazarbuy_cabinet_create_tables();
    
    // Логирование активации
    error_log('[BazarBuy Cabinet] Plugin activated. Version: ' . BAZARBUY_CABINET_VERSION);
}

// ═══════════════════════════════════════════════════════════════════════════
// ДЕАКТИВАЦИЯ ПЛАГИНА
// ═══════════════════════════════════════════════════════════════════════════

register_deactivation_hook(__FILE__, 'bazarbuy_cabinet_deactivate');

function bazarbuy_cabinet_deactivate() {
    // Сброс постоянных ссылок
    flush_rewrite_rules();
    
    // Логирование деактивации
    error_log('[BazarBuy Cabinet] Plugin deactivated.');
}

// ═══════════════════════════════════════════════════════════════════════════
// УДАЛЕНИЕ ПЛАГИНА (опционально)
// ═══════════════════════════════════════════════════════════════════════════

register_uninstall_hook(__FILE__, 'bazarbuy_cabinet_uninstall');

function bazarbuy_cabinet_uninstall() {
    // Внимание: Этот код выполнится при удалении плагина!
    // Раскомментируйте только если хотите очищать данные при удалении
    
    // Удаление таблиц (опционально)
    // global $wpdb;
    // $wpdb->query("DROP TABLE IF EXISTS {$wpdb->prefix}bazarbuy_chat_messages");
    
    // Удаление опций (опционально)
    // delete_option('bazarbuy_cabinet_settings');
    
    error_log('[BazarBuy Cabinet] Plugin uninstalled.');
}



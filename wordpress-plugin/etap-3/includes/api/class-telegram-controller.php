<?php
/**
 * BazarBuy Telegram Controller
 * 
 * Контроллер для отправки уведомлений в Telegram
 * Поддерживает mock режим для разработки
 * 
 * @package Bazarbuy_Cabinet
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class Bazarbuy_Telegram_Controller {
    
    /**
     * Экземпляр класса для формирования ответов
     * 
     * @var Bazarbuy_Response
     */
    private $response;
    
    /**
     * Использовать ли mock режим (только логирование)
     * 
     * @var bool
     */
    private $use_mock;
    
    /**
     * Telegram Bot Token
     * 
     * @var string|null
     */
    private $bot_token;
    
    /**
     * Telegram Chat ID
     * 
     * @var string|null
     */
    private $chat_id;
    
    /**
     * Конструктор
     */
    public function __construct() {
        $this->response = new Bazarbuy_Response();
        
        // Проверка режима: если константа не определена, используем mock
        $this->use_mock = defined('BAZARBUY_TELEGRAM_ENABLED') 
            ? !BAZARBUY_TELEGRAM_ENABLED 
            : true; // По умолчанию mock режим
        
        // Получаем настройки Telegram (если не в mock режиме)
        if (!$this->use_mock) {
            $this->bot_token = defined('BAZARBUY_TELEGRAM_BOT_TOKEN') 
                ? BAZARBUY_TELEGRAM_BOT_TOKEN 
                : null;
            
            $this->chat_id = defined('BAZARBUY_TELEGRAM_CHAT_ID') 
                ? BAZARBUY_TELEGRAM_CHAT_ID 
                : null;
        }
    }
    
    /**
     * Регистрация REST API маршрутов
     * 
     * @return void
     */
    public function register_routes() {
        register_rest_route('cabinet/v1', '/telegram/notify', [
            'methods'             => 'POST',
            'callback'            => [$this, 'notify'],
            'permission_callback' => [$this, 'check_auth'],
        ]);
    }
    
    /**
     * Проверка авторизации пользователя
     * 
     * @return bool|WP_Error
     */
    public function check_auth() {
        // Используем существующую JWT проверку плагина
        if (method_exists('Bazarbuy_Auth', 'check_jwt_permission')) {
            return Bazarbuy_Auth::check_jwt_permission();
        }
        
        // Fallback
        return is_user_logged_in();
    }
    
    /**
     * POST /telegram/notify
     * Отправить уведомление в Telegram
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function notify($request) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return $this->response->error_response('unauthorized', 'Authentication required', 401);
        }
        
        // Получаем данные запроса
        $params = $request->get_json_params();
        $type = isset($params['type']) ? $params['type'] : 'new_message';
        
        // Валидация типа
        $allowed_types = ['new_message', 'new_order', 'client_registered', 'CHAT_ACTIVATED', 'REQUISITES_FILLED', 'MESSAGE'];
        if (!in_array($type, $allowed_types)) {
            return $this->response->error_response(
                'validation_error',
                'Invalid notification type',
                400
            );
        }
        
        // Отправляем уведомление
        $result = $this->send_notification([
            'type' => $type,
            'clientId' => $params['clientId'] ?? null,
            'clientName' => $params['clientName'] ?? null,
            'clientCity' => $params['clientCity'] ?? null,
            'clientEmail' => $params['clientEmail'] ?? null,
            'text' => $params['text'] ?? null,
            'orderId' => $params['orderId'] ?? null,
            'orderTotal' => $params['orderTotal'] ?? null,
            'activeOrdersCount' => $params['activeOrdersCount'] ?? 0,
            'requisites' => $params['requisites'] ?? null
        ]);
        
        if ($result) {
            return $this->response->success_response(['success' => true]);
        } else {
            return $this->response->error_response(
                'send_failed',
                'Failed to send Telegram notification',
                500
            );
        }
    }
    
    /**
     * Отправить уведомление
     * 
     * @param array $data Данные уведомления
     * @return bool Успех отправки
     */
    public function send_notification($data) {
        // Форматируем сообщение
        $message = $this->format_message($data);
        
        if ($this->use_mock) {
            // Mock режим: только логирование
            error_log('[Bazarbuy_Telegram Mock] Уведомление: ' . $message);
            return true;
        }
        
        // Реальный режим: отправка в Telegram
        return $this->send_to_telegram($message);
    }
    
    /**
     * Форматировать сообщение для Telegram
     * 
     * Формат соответствует formatTelegramMessage() из cabinet-api.js
     * 
     * @param array $data
     * @return string Отформатированное сообщение
     */
    private function format_message($data) {
        $type = $data['type'] ?? 'MESSAGE';
        $client_id = $data['clientId'] ?? 'N/A';
        $client_name = $data['clientName'] ?? '';
        $client_city = $data['clientCity'] ?? '';
        $client_email = $data['clientEmail'] ?? '';
        $active_orders = $data['activeOrdersCount'] ?? 0;
        $order_id = $data['orderId'] ?? null;
        $text = $data['text'] ?? '';
        
        // Типы уведомлений
        $type_labels = [
            'CHAT_ACTIVATED' => '💬 Клиент открыл чат',
            'REQUISITES_FILLED' => '📋 Клиент заполнил реквизиты',
            'MESSAGE' => '✉️ Новое сообщение',
            'new_message' => '✉️ Новое сообщение',
            'new_order' => '📦 Новый заказ',
            'client_registered' => '👤 Новый клиент'
        ];
        
        $header = $type_labels[$type] ?? $type_labels['MESSAGE'];
        
        // Формируем сообщение
        $message = $header . "\n\n";
        $message .= "Клиент №" . str_replace(['CL-', 'BB-'], '', $client_id) . "\n";
        
        // Имя и город
        if ($client_name || $client_city) {
            $name_city = trim($client_name . ($client_city ? ', ' . $client_city : ''));
            if ($name_city) {
                $message .= $name_city . "\n";
            }
        }
        
        // Email
        if ($client_email) {
            $message .= "Email: " . $client_email . "\n";
        }
        
        $message .= "\n";
        $message .= "Активные заказы: " . $active_orders . "\n";
        
        // Текущий заказ
        if ($order_id) {
            $message .= "Текущий: " . $order_id . "\n";
        }
        
        // Текст сообщения
        if ($text) {
            $message .= "\nСообщение:\n\"" . $text . "\"";
        }
        
        // Реквизиты (если заполнены)
        if ($type === 'REQUISITES_FILLED' && isset($data['requisites'])) {
            $req = $data['requisites'];
            $message .= "\n\nРеквизиты:\n";
            $message .= "• " . ($req['name'] ?? 'Не указано') . "\n";
            $message .= "• " . ($req['currency'] ?? 'RUB') . "\n";
            if (isset($req['inn'])) {
                $message .= "• ИНН: " . $req['inn'] . "\n";
            }
        }
        
        return $message;
    }
    
    /**
     * Отправить сообщение в Telegram через Bot API
     * 
     * @param string $message Текст сообщения
     * @return bool Успех отправки
     */
    private function send_to_telegram($message) {
        if (!$this->bot_token || !$this->chat_id) {
            error_log('[Bazarbuy_Telegram] Bot token or chat ID not configured');
            return false;
        }
        
        $url = 'https://api.telegram.org/bot' . $this->bot_token . '/sendMessage';
        
        // Форматируем сообщение для HTML (Telegram поддерживает HTML)
        $html_message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        $html_message = nl2br($html_message);
        
        $body = [
            'chat_id' => $this->chat_id,
            'text' => $html_message,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true
        ];
        
        // Отправляем через wp_remote_post (WordPress API)
        $response = wp_remote_post($url, [
            'body' => $body,
            'timeout' => 10,
            'sslverify' => true
        ]);
        
        // Обработка ошибок
        if (is_wp_error($response)) {
            error_log('[Bazarbuy_Telegram] WP Error: ' . $response->get_error_message());
            return false;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        
        if ($response_code !== 200) {
            error_log('[Bazarbuy_Telegram] API Error: ' . $response_code . ' - ' . $response_body);
            return false;
        }
        
        $result = json_decode($response_body, true);
        
        if (!$result || !isset($result['ok']) || !$result['ok']) {
            error_log('[Bazarbuy_Telegram] API returned error: ' . $response_body);
            return false;
        }
        
        return true;
    }
}



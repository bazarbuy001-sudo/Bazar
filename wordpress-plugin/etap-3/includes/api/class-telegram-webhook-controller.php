<?php
/**
 * BazarBuy Telegram Webhook Controller
 * 
 * Обработка входящих сообщений из Telegram (ответы менеджера)
 * 
 * @package Bazarbuy_Cabinet
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class Bazarbuy_Telegram_Webhook_Controller {
    
    /**
     * Экземпляр класса для работы с БД
     * 
     * @var Bazarbuy_Chat_DB
     */
    private $db;
    
    /**
     * Telegram Chat ID для проверки
     * 
     * @var string|null
     */
    private $allowed_chat_id;
    
    /**
     * Telegram Secret Token (опционально для безопасности)
     * 
     * @var string|null
     */
    private $secret_token;
    
    /**
     * Конструктор
     */
    public function __construct() {
        $this->db = new Bazarbuy_Chat_DB();
        
        $this->allowed_chat_id = defined('BAZARBUY_TELEGRAM_CHAT_ID') 
            ? BAZARBUY_TELEGRAM_CHAT_ID 
            : null;
        
        $this->secret_token = defined('BAZARBUY_TELEGRAM_SECRET_TOKEN') 
            ? BAZARBUY_TELEGRAM_SECRET_TOKEN 
            : null;
    }
    
    /**
     * Регистрация REST API маршрутов
     * 
     * @return void
     */
    public function register_routes() {
        register_rest_route('cabinet/v1', '/telegram/webhook', [
            'methods'             => 'POST',
            'callback'            => [$this, 'handle'],
            'permission_callback' => '__return_true', // Публичный endpoint для Telegram
        ]);
    }
    
    /**
     * POST /telegram/webhook
     * Обработка webhook от Telegram
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function handle($request) {
        // Логирование для отладки
        error_log('[Telegram Webhook] Received request');
        
        // Проверка secret token (если установлен)
        if ($this->secret_token) {
            $received_token = $request->get_header('X-Telegram-Bot-Api-Secret-Token');
            if ($received_token !== $this->secret_token) {
                error_log('[Telegram Webhook] Invalid secret token');
                return new WP_REST_Response(['ok' => false, 'error' => 'Invalid token'], 403);
            }
        }
        
        // Проверка IP адреса Telegram (дополнительная безопасность)
        $remote_ip = $this->get_client_ip();
        if (!$this->is_telegram_ip($remote_ip)) {
            error_log('[Telegram Webhook] Request from invalid IP: ' . $remote_ip);
            // Не блокируем, но логируем (может быть прокси)
        }
        
        // Получаем данные обновления
        $data = json_decode($request->get_body(), true);
        
        if (!$data) {
            error_log('[Telegram Webhook] Invalid JSON data');
            return new WP_REST_Response(['ok' => true], 200);
        }
        
        // Обрабатываем только сообщения
        if (!isset($data['message'])) {
            // Может быть редактирование, удаление и т.д. - игнорируем
            return new WP_REST_Response(['ok' => true], 200);
        }
        
        $message = $data['message'];
        $chat_id = $message['chat']['id'] ?? null;
        $text = trim($message['text'] ?? '');
        
        if (!$chat_id || !$text) {
            return new WP_REST_Response(['ok' => true], 200);
        }
        
        // Проверка chat_id (только разрешённый чат)
        if ($this->allowed_chat_id && (string)$chat_id !== (string)$this->allowed_chat_id) {
            error_log('[Telegram Webhook] Invalid chat id: ' . $chat_id . ' (expected: ' . $this->allowed_chat_id . ')');
            return new WP_REST_Response(['ok' => true], 200);
        }
        
        // Извлекаем clientId из сообщения
        $client_id = $this->extract_client_id($text, $message);
        
        if (!$client_id) {
            error_log('[Telegram Webhook] clientId not found in message: ' . $text);
            return new WP_REST_Response(['ok' => true], 200);
        }
        
        // Получаем user_id по clientId
        $user_id = $this->get_user_id_by_client_id($client_id);
        
        if (!$user_id) {
            error_log('[Telegram Webhook] User not found for clientId: ' . $client_id);
            return new WP_REST_Response(['ok' => true], 200);
        }
        
        // Извлекаем orderId (если есть)
        $order_id = $this->extract_order_id($text);
        
        // Сохраняем сообщение от менеджера
        $message_id = $this->db->save_message(
            $user_id,
            'manager',
            sanitize_text_field($text),
            $order_id
        );
        
        if ($message_id) {
            // Обновляем статус на "delivered"
            $this->db->update_message_status($message_id, 'delivered');
            
            error_log('[Telegram Webhook] Message saved: ' . $message_id . ' for clientId: ' . $client_id);
        } else {
            error_log('[Telegram Webhook] Failed to save message');
        }
        
        // Всегда возвращаем успех, чтобы Telegram не повторял запрос
        return new WP_REST_Response(['ok' => true], 200);
    }
    
    /**
     * Извлечь clientId из текста сообщения
     * 
     * Поддерживает форматы:
     * - [CID:15] в начале или в конце сообщения
     * - Reply к сообщению бота (извлекает из контекста)
     * 
     * @param string $text Текст сообщения
     * @param array $message Полное сообщение Telegram
     * @return int|null
     */
    private function extract_client_id($text, $message = []) {
        // Вариант A: Формат [CID:15] в тексте
        if (preg_match('/\[CID:(\d+)\]/i', $text, $matches)) {
            return (int)$matches[1];
        }
        
        // Вариант B: Reply к сообщению бота
        if (isset($message['reply_to_message']['text'])) {
            $reply_text = $message['reply_to_message']['text'];
            
            // Ищем clientId в тексте бота (обычно в формате "Клиент №15" или "CID:15")
            if (preg_match('/Клиент\s*№?(\d+)/i', $reply_text, $matches)) {
                return (int)$matches[1];
            }
            
            if (preg_match('/CID[:\s]*(\d+)/i', $reply_text, $matches)) {
                return (int)$matches[1];
            }
        }
        
        // Вариант C: Если в контексте чата уже есть сохранённый clientId
        // (можно хранить в transients для каждого chat_id)
        $chat_id = $message['chat']['id'] ?? null;
        if ($chat_id) {
            $cached_client_id = get_transient('telegram_chat_client_' . $chat_id);
            if ($cached_client_id) {
                return (int)$cached_client_id;
            }
        }
        
        return null;
    }
    
    /**
     * Извлечь orderId из текста (если есть)
     * 
     * @param string $text
     * @return int|null
     */
    private function extract_order_id($text) {
        // Формат: [ORD:123] или "Заказ: 123"
        if (preg_match('/\[ORD:(\d+)\]/i', $text, $matches)) {
            return (int)$matches[1];
        }
        
        if (preg_match('/Заказ[:\s]*(\d+)/i', $text, $matches)) {
            return (int)$matches[1];
        }
        
        return null;
    }
    
    /**
     * Получить user_id по clientId
     * 
     * @param string $client_id В формате "CL-000001" или "BB-000001"
     * @return int|null
     */
    private function get_user_id_by_client_id($client_id) {
        // Если передан номер без префикса
        if (is_numeric($client_id)) {
            return (int)$client_id;
        }
        
        // Извлекаем номер из формата CL-000001
        if (preg_match('/^(?:CL|BB)-(\d+)$/i', $client_id, $matches)) {
            $user_id = (int)$matches[1];
            
            // Проверяем, существует ли пользователь
            if (get_userdata($user_id)) {
                return $user_id;
            }
        }
        
        // Ищем через user_meta
        global $wpdb;
        $results = $wpdb->get_col($wpdb->prepare(
            "SELECT user_id FROM {$wpdb->usermeta} 
             WHERE meta_key = 'bazarbuy_client_id' 
             AND meta_value = %s 
             LIMIT 1",
            $client_id
        ));
        
        return !empty($results) ? (int)$results[0] : null;
    }
    
    /**
     * Получить IP адрес клиента
     * 
     * @return string
     */
    private function get_client_ip() {
        $ip_keys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
        
        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                
                // Обработка X-Forwarded-For (может быть список IP)
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                
                return $ip;
            }
        }
        
        return '0.0.0.0';
    }
    
    /**
     * Проверить, является ли IP адресом Telegram
     * 
     * Список IP диапазонов Telegram Bot API:
     * - 149.154.160.0/20
     * - 91.108.4.0/22
     * 
     * @param string $ip
     * @return bool
     */
    private function is_telegram_ip($ip) {
        // Упрощённая проверка (можно расширить)
        $telegram_ranges = [
            '149.154.160.',
            '149.154.161.',
            '149.154.162.',
            '149.154.163.',
            '149.154.164.',
            '149.154.165.',
            '149.154.166.',
            '149.154.167.',
            '91.108.4.',
            '91.108.5.',
            '91.108.6.',
            '91.108.7.',
        ];
        
        foreach ($telegram_ranges as $range) {
            if (strpos($ip, $range) === 0) {
                return true;
            }
        }
        
        return false;
    }
}



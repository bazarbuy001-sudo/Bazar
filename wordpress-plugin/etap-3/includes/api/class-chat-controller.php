<?php
/**
 * BazarBuy Chat Controller
 * 
 * Контроллер для работы с чатом (отправка и получение сообщений)
 * 
 * @package Bazarbuy_Cabinet
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class Bazarbuy_Chat_Controller {
    
    /**
     * Экземпляр класса для формирования ответов
     * 
     * @var Bazarbuy_Response
     */
    private $response;
    
    /**
     * Экземпляр класса для работы с БД
     * 
     * @var Bazarbuy_Chat_DB
     */
    private $db;
    
    /**
     * Максимальная длина сообщения (символов)
     */
    const MAX_MESSAGE_LENGTH = 2000;
    
    /**
     * Rate limiting: максимальное количество сообщений в минуту
     */
    const RATE_LIMIT_MESSAGES = 10;
    
    /**
     * Rate limiting: временное окно (секунды)
     */
    const RATE_LIMIT_WINDOW = 60;
    
    /**
     * Конструктор
     */
    public function __construct() {
        $this->response = new Bazarbuy_Response();
        $this->db = new Bazarbuy_Chat_DB();
    }
    
    /**
     * Регистрация REST API маршрутов
     * 
     * @return void
     */
    public function register_routes() {
        register_rest_route('cabinet/v1', '/chat/history', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_history'],
            'permission_callback' => [$this, 'check_auth'],
        ]);
        
        register_rest_route('cabinet/v1', '/chat/send', [
            'methods'             => 'POST',
            'callback'            => [$this, 'send_message'],
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
     * GET /chat/history
     * Получить историю сообщений
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_history($request) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return $this->response->error_response('unauthorized', 'Authentication required', 401);
        }
        
        // Параметры запроса
        $limit = (int)$request->get_param('limit') ?: 50;
        $offset = (int)$request->get_param('offset') ?: 0;
        $order_id = $request->get_param('orderId');
        
        // Валидация limit (макс. 100 сообщений за раз)
        $limit = min($limit, 100);
        $limit = max($limit, 1);
        
        // Валидация offset (не может быть отрицательным)
        $offset = max($offset, 0);
        
        // Получаем сообщения
        $messages = $this->db->get_messages($user_id, $limit, $offset, $order_id);
        
        return $this->response->success_response($messages);
    }
    
    /**
     * POST /chat/send
     * Отправить сообщение
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function send_message($request) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return $this->response->error_response('unauthorized', 'Authentication required', 401);
        }
        
        // Получаем данные запроса
        $params = $request->get_json_params();
        $message_text = isset($params['message']) ? trim($params['message']) : '';
        $order_id = isset($params['orderId']) ? (int)$params['orderId'] : null;
        
        // Валидация сообщения
        if (empty($message_text)) {
            return $this->response->error_response(
                'validation_error',
                'Message text is required',
                400
            );
        }
        
        // Проверка длины сообщения
        if (mb_strlen($message_text) > self::MAX_MESSAGE_LENGTH) {
            return $this->response->error_response(
                'validation_error',
                sprintf('Message too long. Maximum length is %d characters', self::MAX_MESSAGE_LENGTH),
                400
            );
        }
        
        // Rate limiting: проверка количества сообщений за последнюю минуту
        if (!$this->check_rate_limit($user_id)) {
            return $this->response->error_response(
                'rate_limit_exceeded',
                sprintf('Too many messages. Maximum %d messages per minute', self::RATE_LIMIT_MESSAGES),
                429
            );
        }
        
        // Очистка HTML и экранирование (для безопасности)
        $message_text = wp_strip_all_tags($message_text);
        $message_text = sanitize_text_field($message_text);
        
        // Сохраняем сообщение
        $message_id = $this->db->save_message($user_id, 'client', $message_text, $order_id);
        
        if (!$message_id) {
            return $this->response->error_response(
                'internal_error',
                'Failed to save message',
                500
            );
        }
        
        // Обновляем счётчик rate limiting
        $this->update_rate_limit_counter($user_id);
        
        // Отправляем уведомление в Telegram (если включено)
        $this->notify_telegram($user_id, $message_text, $order_id);
        
        // Возвращаем результат
        return $this->response->success_response([
            'id' => $message_id,
            'status' => 'pending'
        ]);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RATE LIMITING
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Проверить rate limit для пользователя
     * 
     * @param int $user_id
     * @return bool true если лимит не превышен, false если превышен
     */
    private function check_rate_limit($user_id) {
        $transient_key = 'bazarbuy_chat_rate_' . $user_id;
        $rate_data = get_transient($transient_key);
        
        if ($rate_data === false) {
            // Первое сообщение за период
            return true;
        }
        
        $count = (int)$rate_data['count'];
        $window_start = (int)$rate_data['window_start'];
        $current_time = time();
        
        // Если прошло больше времени окна, сбрасываем счётчик
        if ($current_time - $window_start > self::RATE_LIMIT_WINDOW) {
            return true;
        }
        
        // Проверяем лимит
        return $count < self::RATE_LIMIT_MESSAGES;
    }
    
    /**
     * Обновить счётчик rate limiting
     * 
     * @param int $user_id
     * @return void
     */
    private function update_rate_limit_counter($user_id) {
        $transient_key = 'bazarbuy_chat_rate_' . $user_id;
        $rate_data = get_transient($transient_key);
        
        $current_time = time();
        
        if ($rate_data === false || ($current_time - (int)$rate_data['window_start'] > self::RATE_LIMIT_WINDOW)) {
            // Начинаем новый период
            $rate_data = [
                'count' => 1,
                'window_start' => $current_time
            ];
        } else {
            // Увеличиваем счётчик
            $rate_data['count'] = (int)$rate_data['count'] + 1;
        }
        
        // Сохраняем с TTL = окно + 10 секунд (запас)
        set_transient($transient_key, $rate_data, self::RATE_LIMIT_WINDOW + 10);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TELEGRAM УВЕДОМЛЕНИЯ
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Отправить уведомление в Telegram
     * 
     * @param int $user_id
     * @param string $message_text
     * @param int|null $order_id
     * @return void
     */
    private function notify_telegram($user_id, $message_text, $order_id = null) {
        // Получаем данные клиента для уведомления
        $client_id = get_user_meta($user_id, 'bazarbuy_client_id', true);
        $client_name = get_user_meta($user_id, 'bazarbuy_name', true);
        $client_city = get_user_meta($user_id, 'bazarbuy_city', true);
        
        // Если есть класс Telegram контроллера, используем его
        if (class_exists('Bazarbuy_Telegram_Controller')) {
            $telegram = new Bazarbuy_Telegram_Controller();
            $telegram->send_notification([
                'type' => 'new_message',
                'clientId' => $client_id ?: 'CL-' . str_pad($user_id, 6, '0', STR_PAD_LEFT),
                'clientName' => $client_name ?: '',
                'text' => $message_text,
                'orderId' => $order_id ? (string)$order_id : null
            ]);
        }
    }
}



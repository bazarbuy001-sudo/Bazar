<?php
/**
 * BazarBuy Admin Chat Controller
 * 
 * Контроллер для работы менеджера с чатом из админки WordPress
 * 
 * @package Bazarbuy_Cabinet
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class Bazarbuy_Admin_Chat_Controller {
    
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
        register_rest_route('cabinet/v1', '/admin/chat/threads', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_threads'],
            'permission_callback' => [$this, 'check_permission'],
        ]);
        
        register_rest_route('cabinet/v1', '/admin/chat/messages', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_messages'],
            'permission_callback' => [$this, 'check_permission'],
        ]);
        
        register_rest_route('cabinet/v1', '/admin/chat/send', [
            'methods'             => 'POST',
            'callback'            => [$this, 'send_message'],
            'permission_callback' => [$this, 'check_permission'],
        ]);
        
        register_rest_route('cabinet/v1', '/admin/chat/mark-read', [
            'methods'             => 'POST',
            'callback'            => [$this, 'mark_read'],
            'permission_callback' => [$this, 'check_permission'],
        ]);
    }
    
    /**
     * Проверка прав доступа (только менеджеры)
     * 
     * @return bool|WP_Error
     */
    public function check_permission() {
        // Проверяем права: manage_options или специальная роль менеджера
        if (current_user_can('manage_options')) {
            return true;
        }
        
        // Проверка специальной роли bazarbuy_manager
        $user = wp_get_current_user();
        if (in_array('bazarbuy_manager', $user->roles)) {
            return true;
        }
        
        return new WP_Error(
            'forbidden',
            'You do not have permission to access admin chat',
            ['status' => 403]
        );
    }
    
    /**
     * GET /admin/chat/threads
     * Получить список диалогов (клиентов с непрочитанными сообщениями)
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_threads($request) {
        global $wpdb;
        
        // Получаем список клиентов с последними сообщениями
        // В mock режиме используем упрощённую логику
        
        if ($this->db->use_mock ?? true) {
            // Mock: получаем список пользователей с сообщениями из transients
            $transient_keys = $wpdb->get_col(
                "SELECT option_name FROM {$wpdb->options} 
                 WHERE option_name LIKE '_transient_bazarbuy_chat_mock_%'"
            );
            
            $threads = [];
            foreach ($transient_keys as $key) {
                $user_id = str_replace('_transient_bazarbuy_chat_mock_', '', $key);
                $messages = get_transient('bazarbuy_chat_mock_' . $user_id);
                
                if (!$messages) continue;
                
                // Получаем последнее сообщение
                usort($messages, function($a, $b) {
                    return strtotime($b['created_at']) - strtotime($a['created_at']);
                });
                
                $last_message = $messages[0];
                $user = get_userdata($user_id);
                
                if (!$user) continue;
                
                // Подсчитываем непрочитанные (от клиента)
                $unread_count = 0;
                foreach ($messages as $msg) {
                    if ($msg['sender'] === 'client' && $msg['status'] !== 'read') {
                        $unread_count++;
                    }
                }
                
                $threads[] = [
                    'clientId' => get_user_meta($user_id, 'bazarbuy_client_id', true) 
                        ?: 'CL-' . str_pad($user_id, 6, '0', STR_PAD_LEFT),
                    'clientName' => get_user_meta($user_id, 'bazarbuy_name', true) 
                        ?: $user->display_name,
                    'clientEmail' => $user->user_email,
                    'lastMessage' => $last_message['message'],
                    'lastMessageAt' => date('c', strtotime($last_message['created_at'])),
                    'unreadCount' => $unread_count,
                    'userId' => (int)$user_id
                ];
            }
        } else {
            // Реальная БД: запрос с группировкой
            $table_name = $wpdb->prefix . 'bazarbuy_chat_messages';
            
            $query = "
                SELECT 
                    user_id,
                    MAX(created_at) as last_message_at,
                    COUNT(CASE WHEN sender = 'client' AND status != 'read' THEN 1 END) as unread_count
                FROM {$table_name}
                GROUP BY user_id
                ORDER BY last_message_at DESC
            ";
            
            $results = $wpdb->get_results($query, ARRAY_A);
            
            $threads = [];
            foreach ($results as $row) {
                $user_id = $row['user_id'];
                $user = get_userdata($user_id);
                
                if (!$user) continue;
                
                // Получаем последнее сообщение
                $last_messages = $this->db->get_messages($user_id, 1, 0);
                $last_message = !empty($last_messages) ? $last_messages[0] : null;
                
                $threads[] = [
                    'clientId' => get_user_meta($user_id, 'bazarbuy_client_id', true) 
                        ?: 'CL-' . str_pad($user_id, 6, '0', STR_PAD_LEFT),
                    'clientName' => get_user_meta($user_id, 'bazarbuy_name', true) 
                        ?: $user->display_name,
                    'clientEmail' => $user->user_email,
                    'lastMessage' => $last_message ? $last_message['text'] : '',
                    'lastMessageAt' => $last_message ? $last_message['createdAt'] : null,
                    'unreadCount' => (int)$row['unread_count'],
                    'userId' => (int)$user_id
                ];
            }
        }
        
        return $this->response->success_response($threads);
    }
    
    /**
     * GET /admin/chat/messages
     * Получить сообщения диалога
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_messages($request) {
        $client_id_param = $request->get_param('clientId');
        $order_id = $request->get_param('orderId');
        
        // clientId может быть в формате "CL-000001" или просто ID
        if (preg_match('/^CL-(\d+)$/', $client_id_param, $matches)) {
            $user_id = (int)$matches[1];
        } else {
            $user_id = (int)$client_id_param;
        }
        
        if (!$user_id) {
            return $this->response->error_response(
                'validation_error',
                'clientId is required',
                400
            );
        }
        
        $limit = (int)$request->get_param('limit') ?: 50;
        $offset = (int)$request->get_param('offset') ?: 0;
        
        // Получаем сообщения
        $messages = $this->db->get_messages($user_id, $limit, $offset, $order_id);
        
        return $this->response->success_response($messages);
    }
    
    /**
     * POST /admin/chat/send
     * Отправить сообщение от менеджера
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function send_message($request) {
        $params = $request->get_json_params();
        
        $client_id_param = $params['clientId'] ?? null;
        $message_text = isset($params['message']) ? trim($params['message']) : '';
        
        // Извлекаем user_id из clientId
        if (preg_match('/^CL-(\d+)$/', $client_id_param, $matches)) {
            $user_id = (int)$matches[1];
        } else {
            $user_id = (int)$client_id_param;
        }
        
        if (!$user_id || empty($message_text)) {
            return $this->response->error_response(
                'validation_error',
                'clientId and message are required',
                400
            );
        }
        
        // Проверка длины сообщения
        if (mb_strlen($message_text) > 2000) {
            return $this->response->error_response(
                'validation_error',
                'Message too long. Maximum length is 2000 characters',
                400
            );
        }
        
        // Очистка HTML
        $message_text = wp_strip_all_tags($message_text);
        $message_text = sanitize_text_field($message_text);
        
        $order_id = isset($params['orderId']) ? (int)$params['orderId'] : null;
        
        // Сохраняем сообщение от менеджера
        $message_id = $this->db->save_message($user_id, 'manager', $message_text, $order_id);
        
        if (!$message_id) {
            return $this->response->error_response(
                'internal_error',
                'Failed to save message',
                500
            );
        }
        
        // Обновляем статус на "delivered"
        $this->db->update_message_status($message_id, 'delivered');
        
        return $this->response->success_response([
            'id' => $message_id,
            'status' => 'delivered'
        ]);
    }
    
    /**
     * POST /admin/chat/mark-read
     * Отметить сообщения как прочитанные
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function mark_read($request) {
        $params = $request->get_json_params();
        
        $client_id_param = $params['clientId'] ?? null;
        $message_ids = $params['messageIds'] ?? [];
        
        // Если передан clientId, помечаем все непрочитанные сообщения клиента
        if ($client_id_param) {
            if (preg_match('/^CL-(\d+)$/', $client_id_param, $matches)) {
                $user_id = (int)$matches[1];
            } else {
                $user_id = (int)$client_id_param;
            }
            
            if (!$user_id) {
                return $this->response->error_response(
                    'validation_error',
                    'Invalid clientId',
                    400
                );
            }
            
            // Получаем все непрочитанные сообщения от клиента
            $messages = $this->db->get_messages($user_id, 1000, 0);
            
            foreach ($messages as $msg) {
                if ($msg['from'] === 'client' && $msg['status'] !== 'read') {
                    $this->db->update_message_status($msg['id'], 'read');
                }
            }
            
            return $this->response->success_response(['marked' => true]);
        }
        
        // Если передан массив messageIds
        if (empty($message_ids) || !is_array($message_ids)) {
            return $this->response->error_response(
                'validation_error',
                'clientId or messageIds array is required',
                400
            );
        }
        
        $marked_count = 0;
        foreach ($message_ids as $msg_id) {
            if ($this->db->update_message_status($msg_id, 'read')) {
                $marked_count++;
            }
        }
        
        return $this->response->success_response([
            'marked' => $marked_count
        ]);
    }
}



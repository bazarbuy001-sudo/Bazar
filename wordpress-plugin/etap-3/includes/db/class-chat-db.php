<?php
/**
 * BazarBuy Chat Database Abstraction
 * 
 * Абстракция для работы с БД чата с поддержкой mock режима
 * 
 * @package Bazarbuy_Cabinet
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class Bazarbuy_Chat_DB {
    
    /**
     * Использовать ли mock режим (без реальной БД)
     * 
     * @var bool
     */
    private $use_mock;
    
    /**
     * Mock хранилище (в памяти для текущего запроса)
     * В реальности лучше использовать transients или файлы
     * 
     * @var array
     */
    private static $mock_storage = [];
    
    /**
     * Конструктор
     */
    public function __construct() {
        // Проверка режима: если константа не определена, используем mock в режиме разработки
        $this->use_mock = defined('BAZARBUY_CHAT_USE_DB') 
            ? !BAZARBUY_CHAT_USE_DB 
            : true; // По умолчанию mock режим
    }
    
    /**
     * Сохранить сообщение
     * 
     * @param int $user_id ID пользователя
     * @param string $sender 'client' | 'manager' | 'system'
     * @param string $message Текст сообщения
     * @param int|null $order_id ID заказа (опционально)
     * @return int|string ID сохранённого сообщения
     */
    public function save_message($user_id, $sender, $message, $order_id = null) {
        if ($this->use_mock) {
            return $this->save_message_mock($user_id, $sender, $message, $order_id);
        }
        
        return $this->save_message_db($user_id, $sender, $message, $order_id);
    }
    
    /**
     * Получить историю сообщений
     * 
     * @param int $user_id ID пользователя
     * @param int $limit Максимальное количество сообщений
     * @param int $offset Смещение
     * @param int|null $order_id Фильтр по заказу (опционально)
     * @return array Массив сообщений
     */
    public function get_messages($user_id, $limit = 50, $offset = 0, $order_id = null) {
        if ($this->use_mock) {
            return $this->get_messages_mock($user_id, $limit, $offset, $order_id);
        }
        
        return $this->get_messages_db($user_id, $limit, $offset, $order_id);
    }
    
    /**
     * Обновить статус сообщения
     * 
     * @param int|string $message_id ID сообщения
     * @param string $status Новый статус
     * @return bool Успех операции
     */
    public function update_message_status($message_id, $status) {
        if ($this->use_mock) {
            return $this->update_message_status_mock($message_id, $status);
        }
        
        return $this->update_message_status_db($message_id, $status);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MOCK РЕАЛИЗАЦИЯ (для разработки без БД)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Сохранить сообщение в mock хранилище
     */
    private function save_message_mock($user_id, $sender, $message, $order_id = null) {
        // Используем transients для персистентности между запросами
        // (в реальном WordPress можно использовать для кэширования)
        $storage_key = 'bazarbuy_chat_mock_' . $user_id;
        $messages = get_transient($storage_key) ?: [];
        
        // Генерируем ID (mock)
        $message_id = 'mock_' . time() . '_' . rand(1000, 9999);
        
        $message_data = [
            'id' => $message_id,
            'user_id' => $user_id,
            'sender' => $sender,
            'message' => $message,
            'order_id' => $order_id,
            'status' => 'pending',
            'created_at' => current_time('mysql'),
            'updated_at' => null
        ];
        
        $messages[] = $message_data;
        
        // Сохраняем через transients (TTL 7 дней)
        set_transient($storage_key, $messages, WEEK_IN_SECONDS);
        
        // Логирование для отладки
        error_log('[Bazarbuy_Chat_DB Mock] Сохранено сообщение: ' . json_encode($message_data));
        
        return $message_id;
    }
    
    /**
     * Получить сообщения из mock хранилища
     */
    private function get_messages_mock($user_id, $limit, $offset, $order_id = null) {
        $storage_key = 'bazarbuy_chat_mock_' . $user_id;
        $all_messages = get_transient($storage_key) ?: [];
        
        // Фильтр по заказу (если указан)
        if ($order_id !== null) {
            $all_messages = array_filter($all_messages, function($msg) use ($order_id) {
                return $msg['order_id'] == $order_id;
            });
            $all_messages = array_values($all_messages); // Переиндексация
        }
        
        // Сортировка по дате (новые первыми)
        usort($all_messages, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });
        
        // Применяем пагинацию
        $messages = array_slice($all_messages, $offset, $limit);
        
        // Форматируем для API
        return array_map(function($msg) {
            return [
                'id' => $msg['id'],
                'from' => $msg['sender'],
                'text' => $msg['message'],
                'status' => $msg['status'],
                'createdAt' => date('c', strtotime($msg['created_at'])),
                'orderId' => $msg['order_id']
            ];
        }, $messages);
    }
    
    /**
     * Обновить статус сообщения в mock хранилище
     */
    private function update_message_status_mock($message_id, $status) {
        // Находим сообщение во всех пользователях (упрощённая реализация)
        // В реальности нужен более эффективный способ
        $found = false;
        
        // Ищем в transients всех пользователей (ограниченная реализация для mock)
        // В реальности нужен более эффективный поиск
        global $wpdb;
        $transient_keys = $wpdb->get_col(
            "SELECT option_name FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_bazarbuy_chat_mock_%'"
        );
        
        foreach ($transient_keys as $key) {
            $user_id = str_replace('_transient_bazarbuy_chat_mock_', '', $key);
            $messages = get_transient('bazarbuy_chat_mock_' . $user_id);
            
            if (!$messages) continue;
            
            foreach ($messages as &$msg) {
                if ($msg['id'] == $message_id) {
                    $msg['status'] = $status;
                    $msg['updated_at'] = current_time('mysql');
                    $found = true;
                    set_transient('bazarbuy_chat_mock_' . $user_id, $messages, WEEK_IN_SECONDS);
                    break 2;
                }
            }
        }
        
        return $found;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // РЕАЛЬНАЯ РЕАЛИЗАЦИЯ (с БД)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Сохранить сообщение в БД
     */
    private function save_message_db($user_id, $sender, $message, $order_id = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bazarbuy_chat_messages';
        
        $result = $wpdb->insert(
            $table_name,
            [
                'user_id' => $user_id,
                'order_id' => $order_id,
                'sender' => $sender,
                'message' => $message,
                'status' => 'pending',
                'created_at' => current_time('mysql'),
                'updated_at' => null
            ],
            ['%d', '%d', '%s', '%s', '%s', '%s', '%s']
        );
        
        if ($result === false) {
            error_log('[Bazarbuy_Chat_DB] Ошибка сохранения: ' . $wpdb->last_error);
            return false;
        }
        
        return $wpdb->insert_id;
    }
    
    /**
     * Получить сообщения из БД
     */
    private function get_messages_db($user_id, $limit, $offset, $order_id = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bazarbuy_chat_messages';
        
        $where = $wpdb->prepare('user_id = %d', $user_id);
        
        if ($order_id !== null) {
            $where .= $wpdb->prepare(' AND order_id = %d', $order_id);
        }
        
        $query = "
            SELECT id, sender, message, status, created_at, order_id
            FROM {$table_name}
            WHERE {$where}
            ORDER BY created_at DESC
            LIMIT %d OFFSET %d
        ";
        
        $messages = $wpdb->get_results(
            $wpdb->prepare($query, $limit, $offset),
            ARRAY_A
        );
        
        // Форматируем для API
        return array_map(function($msg) {
            return [
                'id' => (int)$msg['id'],
                'from' => $msg['sender'],
                'text' => $msg['message'],
                'status' => $msg['status'],
                'createdAt' => date('c', strtotime($msg['created_at'])),
                'orderId' => $msg['order_id'] ? (string)$msg['order_id'] : null
            ];
        }, $messages ?: []);
    }
    
    /**
     * Обновить статус сообщения в БД
     */
    private function update_message_status_db($message_id, $status) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bazarbuy_chat_messages';
        
        $result = $wpdb->update(
            $table_name,
            [
                'status' => $status,
                'updated_at' => current_time('mysql')
            ],
            ['id' => $message_id],
            ['%s', '%s'],
            ['%d']
        );
        
        return $result !== false;
    }
    
    /**
     * Проверить, существует ли таблица
     * 
     * @return bool
     */
    public static function table_exists() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'bazarbuy_chat_messages';
        
        return $wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") === $table_name;
    }
}



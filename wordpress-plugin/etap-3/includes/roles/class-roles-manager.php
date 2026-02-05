<?php
/**
 * BazarBuy Roles Manager
 * 
 * Управление ролями и правами доступа для системы чата
 * 
 * @package Bazarbuy_Cabinet
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class Bazarbuy_Roles_Manager {
    
    /**
     * Регистрация ролей и прав при активации плагина
     */
    public static function register_roles() {
        // Роль менеджера поддержки
        add_role(
            'bazarbuy_manager',
            'BazarBuy Manager',
            [
                'read' => true,
                
                // Права на чтение админ-чата
                'chat_read_admin' => true,
                
                // Права на отправку сообщений от менеджера
                'chat_send_admin' => true,
                
                // Права на управление диалогами (закрытие, архивирование)
                'chat_manage_threads' => true,
            ]
        );
        
        // Добавляем права клиентам (для subscriber роли)
        $subscriber = get_role('subscriber');
        if ($subscriber) {
            $subscriber->add_cap('chat_read_client');
            $subscriber->add_cap('chat_send_client');
        }
        
        // Добавляем все права администраторам
        $admin = get_role('administrator');
        if ($admin) {
            $admin->add_cap('chat_read_admin');
            $admin->add_cap('chat_send_admin');
            $admin->add_cap('chat_manage_threads');
            $admin->add_cap('chat_view_metrics');
            $admin->add_cap('chat_read_client');
            $admin->add_cap('chat_send_client');
        }
    }
    
    /**
     * Удаление ролей и прав при деактивации плагина
     */
    public static function unregister_roles() {
        // Удаление роли менеджера
        remove_role('bazarbuy_manager');
        
        // Удаление прав у subscriber
        $subscriber = get_role('subscriber');
        if ($subscriber) {
            $subscriber->remove_cap('chat_read_client');
            $subscriber->remove_cap('chat_send_client');
        }
        
        // Удаление прав у administrator (опционально, можно оставить)
        $admin = get_role('administrator');
        if ($admin) {
            $admin->remove_cap('chat_read_admin');
            $admin->remove_cap('chat_send_admin');
            $admin->remove_cap('chat_manage_threads');
            $admin->remove_cap('chat_view_metrics');
        }
    }
    
    /**
     * Проверить, может ли пользователь читать клиентский чат
     * 
     * @param int|null $user_id ID пользователя (null = текущий)
     * @return bool
     */
    public static function can_read_client_chat($user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        if (!$user_id) {
            return false;
        }
        
        return user_can($user_id, 'chat_read_client') || user_can($user_id, 'manage_options');
    }
    
    /**
     * Проверить, может ли пользователь отправлять сообщения как клиент
     * 
     * @param int|null $user_id ID пользователя (null = текущий)
     * @return bool
     */
    public static function can_send_client_chat($user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        if (!$user_id) {
            return false;
        }
        
        return user_can($user_id, 'chat_send_client') || user_can($user_id, 'manage_options');
    }
    
    /**
     * Проверить, может ли пользователь читать админ-чат
     * 
     * @param int|null $user_id ID пользователя (null = текущий)
     * @return bool
     */
    public static function can_read_admin_chat($user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        if (!$user_id) {
            return false;
        }
        
        return user_can($user_id, 'chat_read_admin') || user_can($user_id, 'manage_options');
    }
    
    /**
     * Проверить, может ли пользователь отправлять сообщения как менеджер
     * 
     * @param int|null $user_id ID пользователя (null = текущий)
     * @return bool
     */
    public static function can_send_admin_chat($user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        if (!$user_id) {
            return false;
        }
        
        return user_can($user_id, 'chat_send_admin') || user_can($user_id, 'manage_options');
    }
    
    /**
     * Проверить, может ли пользователь управлять диалогами
     * 
     * @param int|null $user_id ID пользователя (null = текущий)
     * @return bool
     */
    public static function can_manage_threads($user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        if (!$user_id) {
            return false;
        }
        
        return user_can($user_id, 'chat_manage_threads') || user_can($user_id, 'manage_options');
    }
    
    /**
     * Проверить, может ли пользователь просматривать метрики
     * 
     * @param int|null $user_id ID пользователя (null = текущий)
     * @return bool
     */
    public static function can_view_metrics($user_id = null) {
        if ($user_id === null) {
            $user_id = get_current_user_id();
        }
        
        if (!$user_id) {
            return false;
        }
        
        return user_can($user_id, 'chat_view_metrics') || user_can($user_id, 'manage_options');
    }
}



<?php
/**
 * BazarBuy User Controller
 * 
 * Контроллер для работы с данными клиента (Client)
 * Endpoint: GET /wp-json/cabinet/v1/user/client
 * 
 * @package Bazarbuy_Cabinet
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit; // Выход, если файл вызван напрямую
}

class Bazarbuy_User_Controller {
    
    /**
     * Экземпляр класса для формирования ответов
     * 
     * @var Bazarbuy_Response
     */
    private $response;
    
    /**
     * Конструктор
     */
    public function __construct() {
        $this->response = new Bazarbuy_Response();
    }
    
    /**
     * Регистрация REST API маршрутов
     * 
     * @return void
     */
    public function register_routes() {
        register_rest_route('cabinet/v1', '/user/client', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_client'],
            'permission_callback' => [$this, 'check_auth'],
        ]);
    }
    
    /**
     * Проверка авторизации пользователя
     * 
     * Использует JWT токен из заголовка Authorization
     * 
     * @return bool|WP_Error
     */
    public function check_auth() {
        // Проверяем через существующий метод JWT авторизации плагина
        // Если в плагине есть метод check_jwt_permission, используем его
        if (method_exists('Bazarbuy_Auth', 'check_jwt_permission')) {
            return Bazarbuy_Auth::check_jwt_permission();
        }
        
        // Fallback: проверка через WordPress is_user_logged_in()
        return is_user_logged_in();
    }
    
    /**
     * Получить данные клиента
     * 
     * Возвращает данные в формате, совместимом с фронтендом (state.client)
     * 
     * @param WP_REST_Request $request Объект запроса
     * @return WP_REST_Response|WP_Error
     */
    public function get_client($request) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return $this->response->error_response('unauthorized', 'Authentication required', 401);
        }
        
        $user = get_userdata($user_id);
        
        if (!$user) {
            return $this->response->error_response('user_not_found', 'User not found', 404);
        }
        
        // ───────────────────────────────────────────────────────────────────────
        // ГЕНЕРАЦИЯ clientId
        // ───────────────────────────────────────────────────────────────────────
        
        $client_id = get_user_meta($user_id, 'bazarbuy_client_id', true);
        
        if (!$client_id) {
            // Генерируем clientId в формате BB-00001 или CL-00001
            // Используем BB- префикс (BazarBuy), можно изменить на CL-
            $client_id = 'BB-' . str_pad($user_id, 5, '0', STR_PAD_LEFT);
            update_user_meta($user_id, 'bazarbuy_client_id', $client_id);
        }
        
        // ───────────────────────────────────────────────────────────────────────
        // ПОЛУЧЕНИЕ ДАННЫХ ПРОФИЛЯ
        // ───────────────────────────────────────────────────────────────────────
        
        // Базовые поля профиля
        $name = get_user_meta($user_id, 'bazarbuy_name', true) ?: '';
        
        // Если имя не заполнено, используем display_name WordPress
        if (empty($name) && !empty($user->display_name)) {
            $name = $user->display_name;
        }
        
        // Если и display_name пустой, используем user_login
        if (empty($name)) {
            $name = $user->user_login;
        }
        
        $city = get_user_meta($user_id, 'bazarbuy_city', true) ?: '';
        $phone = get_user_meta($user_id, 'bazarbuy_phone', true) ?: '';
        
        // ───────────────────────────────────────────────────────────────────────
        // АВТОРИЗАЦИЯ И ВЕРИФИКАЦИЯ
        // ───────────────────────────────────────────────────────────────────────
        
        $auth_provider = get_user_meta($user_id, 'bazarbuy_auth_provider', true) ?: 'email';
        $email_verified = (bool)get_user_meta($user_id, 'bazarbuy_email_verified', true);
        
        // ───────────────────────────────────────────────────────────────────────
        // ПРОВЕРКА ПЕРВОГО ВХОДА
        // ───────────────────────────────────────────────────────────────────────
        
        // Проверяем, заполнен ли профиль (используется для определения первого входа)
        $profile_completed = get_user_meta($user_id, 'bazarbuy_profile_completed', true);
        $is_first_login = ($profile_completed !== 'true');
        
        // Альтернативная проверка через мета-поле is_first_login
        $first_login_meta = get_user_meta($user_id, 'bazarbuy_first_login', true);
        if ($first_login_meta !== '' && $first_login_meta !== null) {
            $is_first_login = ($first_login_meta !== 'false');
        }
        
        // ───────────────────────────────────────────────────────────────────────
        // ВРЕМЕННЫЕ МЕТКИ
        // ───────────────────────────────────────────────────────────────────────
        
        $created_at = $user->user_registered ?: current_time('mysql');
        $last_login = get_user_meta($user_id, 'bazarbuy_last_login', true);
        
        // Конвертируем в ISO 8601 формат для фронтенда
        if ($created_at) {
            $created_at = date('c', strtotime($created_at));
        }
        if ($last_login) {
            $last_login = date('c', strtotime($last_login));
        }
        
        // ───────────────────────────────────────────────────────────────────────
        // ФОРМИРОВАНИЕ ОТВЕТА
        // ───────────────────────────────────────────────────────────────────────
        
        $data = [
            'id'              => (string)$user_id,
            'clientId'        => $client_id,
            'email'           => $user->user_email,
            'authProvider'    => $auth_provider,
            'emailVerified'   => $email_verified,
            'name'            => $name,
            'city'            => $city,
            'phone'           => $phone,
            'isAuthenticated' => true,
            'isFirstLogin'    => $is_first_login,
            'createdAt'       => $created_at,
            'lastLoginAt'     => $last_login ?: null
        ];
        
        return $this->response->success_response($data);
    }
}



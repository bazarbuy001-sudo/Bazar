# ПЛАН ГИБРИДНОЙ ИНТЕГРАЦИИ WORDPRESS REST API

**Цель:** Минимальные изменения для интеграции WordPress плагина с текущим frontend, сохраняя mock-режим и всю функциональность.

---

## 🔍 АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ

### Текущие endpoints (cabinet-api.js):

```javascript
endpoints: {
    authCheck: '/auth/check',        // ❌ WordPress использует '/auth/me'
    login: '/auth/login',            // ✅ Совпадает
    register: '/auth/register',      // ✅ Совпадает
    socialAuth: '/auth/social',      // ❓ Не указано в WP
    logout: '/auth/logout',          // ✅ Совпадает
    
    client: '/user/client',          // ❌ WordPress только '/user/profile'
    profile: '/user/profile',        // ✅ Совпадает
    
    orders: '/orders',               // ✅ Совпадает
    orderDetails: '/orders/{id}',    // ✅ Совпадает
    
    requisites: '/user/requisites',  // ✅ Совпадает
    
    chatHistory: '/chat/history',    // ❌ Нет в WordPress
    chatSend: '/chat/send',          // ❌ Нет в WordPress
    telegramNotify: '/telegram/notify' // ❌ Нет в WordPress
}
```

### Ожидаемые форматы ответов:

**Текущий код ожидает:**

1. **checkAuth()** → `{ isAuthenticated: boolean, user: Object|null }`
2. **login/register** → `{ success: boolean, token: string, user: Object }`
3. **getClient()** → `{ id, clientId, email, name, ... }` (полный объект Client)
4. **getOrders()** → `Array<Order>`
5. **Чат** → `Array<Message>`

**WordPress плагин возвращает (из документации):**

1. **/auth/me** → `{ success: false, error: {...} }` (без авторизации) или данные пользователя
2. **/auth/register** → `{ success: true, user: {...}, token: "..." }`
3. **/user/profile** → данные профиля (не полный Client)

---

## 📋 ПЛАН ИНТЕГРАЦИИ (ПОЭТАПНО)

### ⚡ ЭТАП 1: БЕЗОПАСНОСТЬ (ВЫСОКИЙ ПРИОРИТЕТ) — День 1

#### 1.1 Изменить endpoint проверки авторизации

**Файл:** `frontend/cabinet/cabinet-api.js`

**Изменение (строка 32):**
```javascript
// БЫЛО:
authCheck: '/auth/check',

// ДОЛЖНО БЫТЬ:
authCheck: '/auth/me',
```

**Также обновить mock (строка 288):**
```javascript
// БЫЛО:
if (endpoint === CONFIG.endpoints.authCheck) {

// ОСТАЁТСЯ БЕЗ ИЗМЕНЕНИЙ (работает с любым endpoint)
```

**Проверка:** После изменения mock-режим продолжит работать, реальный API будет использовать `/auth/me`.

---

#### 1.2 Обработка 401 и JWT expiration

**Файл:** `frontend/cabinet/cabinet-api.js`

**Добавить в функцию `request()` (после строки 265):**

```javascript
if (!response.ok) {
    // Обработка 401 (токен истёк)
    if (response.status === 401) {
        // Очищаем токен
        setAuthToken(null);
        
        // Эмитируем событие для CabinetStore
        window.dispatchEvent(new CustomEvent('cabinet:auth-expired'));
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Сессия истекла. Войдите снова.');
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
}
```

**Добавить обработку события в CabinetStore:**

**Файл:** `frontend/cabinet/cabinet-store.js`

**После строки 136 (в секции событий):**

```javascript
// Слушаем истечение токена
window.addEventListener('cabinet:auth-expired', () => {
    setState(s => ({
        ...s,
        client: { ...initialState.client },
        system: { ...s.system, error: 'Сессия истекла. Войдите снова.' }
    }));
    emitEvent(EVENTS.AUTH_CHANGED, { isAuthenticated: false });
});
```

---

#### 1.3 Адаптация формата ответа /auth/me

**Проблема:** WordPress возвращает `{ success: false, error: {...} }`, текущий код ожидает `{ isAuthenticated: boolean, user: Object|null }`.

**Решение:** Адаптировать ответ в `checkAuth()`.

**Файл:** `frontend/cabinet/cabinet-api.js`

**Изменить метод `checkAuth()` (строка 477-479):**

```javascript
async checkAuth() {
    try {
        const result = await request('GET', CONFIG.endpoints.authCheck);
        
        // Адаптация формата WordPress к текущему формату
        if (result.success === false) {
            return {
                isAuthenticated: false,
                user: null
            };
        }
        
        // Если WordPress вернул данные пользователя напрямую
        if (result.id || result.email) {
            return {
                isAuthenticated: true,
                user: result
            };
        }
        
        // Если уже в нужном формате (для обратной совместимости)
        if (result.isAuthenticated !== undefined) {
            return result;
        }
        
        // Fallback
        return {
            isAuthenticated: false,
            user: null
        };
    } catch (error) {
        // При ошибке считаем неавторизованным
        return {
            isAuthenticated: false,
            user: null
        };
    }
},
```

---

#### 1.4 WordPress плагин: Настройка JWT

**Действие (на сервере):**

1. Открыть `wp-config.php`
2. Добавить после `define('WP_DEBUG', ...);`:
   ```php
   define('BAZARBUY_JWT_SECRET', 'BazarBuy2026SecretKeyForJWTTokens!@#$%');
   ```
   ⚠️ **ВАЖНО:** Заменить на уникальный ключ (минимум 32 символа)

3. Проверить работу JWT:
   ```bash
   curl -X POST https://www.bazarbuy.store/wp/wp-json/cabinet/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"TestPassword123","name":"Test"}' | jq .token
   ```

**Срок жизни токенов:** По умолчанию в WordPress плагине должен быть установлен срок (обычно 7-30 дней). Проверить в `class-jwt.php` и синхронизировать с frontend логикой обновления.

---

#### 1.5 WordPress плагин: Активация rate limiting

**Действие:** Rate limiting должен активироваться автоматически при активации плагина. Проверить:

```bash
# Проверить, что плагин активен
wp plugin list | grep bazarbuy

# Проверить, что таблица создана
wp db query "SHOW TABLES LIKE 'wp_bazarbuy_rate_limits';"
```

**Настройки rate limiting (если нужна настройка):**
- По умолчанию: 5 попыток за 15 минут для `/auth/login`
- Можно изменить в `includes/auth/class-authenticator.php` (если требуется)

---

#### 1.6 WordPress плагин: CORS для разработки

**Файл:** `bazarbuy-cabinet.php` (или `includes/class-response.php`)

**Найти метод `add_cors_headers()` и добавить:**

```php
$allowed_origins = [
    'https://www.bazarbuy.store',
    'https://bazarbuy.store',
    'http://localhost:3000',        // ← ДЛЯ ЛОКАЛЬНОЙ РАЗРАБОТКИ
    'http://localhost:8080',        // ← ДЛЯ ЛОКАЛЬНОЙ РАЗРАБОТКИ
    'http://127.0.0.1:5500'         // ← ДЛЯ LIVE SERVER
];
```

---

### ⚡ ЭТАП 2: ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (СРЕДНИЙ ПРИОРИТЕТ) — День 1-2

#### 2.1 Вариант А (РЕКОМЕНДУЕТСЯ): Добавить `/user/client` в WordPress

**Файл WordPress плагина:** `includes/api/class-profile-controller.php`

**Добавить новый endpoint:**

```php
/**
 * GET /wp-json/cabinet/v1/user/client
 * Возвращает объединённые данные: auth + profile
 */
public function get_client(WP_REST_Request $request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return $this->error_response('unauthorized', 'Authentication required', 401);
    }
    
    $user = get_userdata($user_id);
    
    // Получаем метаданные профиля
    $name = get_user_meta($user_id, 'bazarbuy_name', true) ?: '';
    $city = get_user_meta($user_id, 'bazarbuy_city', true) ?: '';
    $phone = get_user_meta($user_id, 'bazarbuy_phone', true) ?: '';
    
    // Генерируем clientId (если ещё нет)
    $client_id = get_user_meta($user_id, 'bazarbuy_client_id', true);
    if (!$client_id) {
        $client_id = 'CL-' . str_pad($user_id, 6, '0', STR_PAD_LEFT);
        update_user_meta($user_id, 'bazarbuy_client_id', $client_id);
    }
    
    // Проверяем первый вход
    $is_first_login = get_user_meta($user_id, 'bazarbuy_first_login', true) !== 'false';
    
    return $this->success_response([
        'id' => (string)$user_id,
        'clientId' => $client_id,
        'email' => $user->user_email,
        'authProvider' => get_user_meta($user_id, 'bazarbuy_auth_provider', true) ?: 'email',
        'emailVerified' => (bool)get_user_meta($user_id, 'bazarbuy_email_verified', true),
        'name' => $name,
        'city' => $city,
        'phone' => $phone,
        'isAuthenticated' => true,
        'isFirstLogin' => $is_first_login,
        'createdAt' => $user->user_registered,
        'lastLoginAt' => get_user_meta($user_id, 'bazarbuy_last_login', true) ?: null
    ]);
}
```

**Зарегистрировать endpoint в главном файле плагина:**

**Файл:** `bazarbuy-cabinet.php`

**Найти регистрацию routes и добавить:**

```php
register_rest_route('cabinet/v1', '/user/client', [
    'methods' => 'GET',
    'callback' => [$profile_controller, 'get_client'],
    'permission_callback' => [$this, 'check_jwt_permission']
]);
```

**Результат:** Фронтенд остаётся без изменений, работает как раньше.

---

#### 2.2 Вариант Б (ЗАПАСНОЙ): Адаптировать фронтенд для двух запросов

**Если нельзя изменить WordPress плагин:**

**Файл:** `frontend/cabinet/cabinet-api.js`

**Изменить метод `getClient()` (строка 541-543):**

```javascript
async getClient() {
    // Вариант Б: Делаем два запроса и объединяем
    if (CONFIG.useMock) {
        return request('GET', CONFIG.endpoints.client);
    }
    
    // Для WordPress: получаем данные из /auth/me и /user/profile
    try {
        const [authData, profileData] = await Promise.all([
            request('GET', CONFIG.endpoints.authCheck), // /auth/me
            request('GET', CONFIG.endpoints.profile)     // /user/profile
        ]);
        
        // Объединяем данные в формат Client
        const user = authData.user || authData;
        return {
            id: user.id,
            clientId: user.clientId || `CL-${String(user.id).padStart(6, '0')}`,
            email: user.email,
            authProvider: user.authProvider || 'email',
            emailVerified: user.emailVerified || false,
            name: profileData.name || user.name,
            city: profileData.city || user.city,
            phone: profileData.phone || user.phone,
            isAuthenticated: true,
            isFirstLogin: user.isFirstLogin !== false,
            createdAt: user.createdAt || user.user_registered,
            lastLoginAt: user.lastLoginAt || user.last_login_at
        };
    } catch (error) {
        console.error('[CabinetAPI] Error fetching client data:', error);
        throw error;
    }
},
```

**Недостаток:** Два запроса вместо одного, медленнее.

---

### ⚡ ЭТАП 3: ЧАТ И TELEGRAM (СРЕДНИЙ ПРИОРИТЕТ) — День 2-3

#### 3.1 WordPress плагин: Добавить Chat Controller

**Создать файл:** `includes/api/class-chat-controller.php`

**Содержимое:**

```php
<?php

class Bazarbuy_Chat_Controller {
    private $response_helper;
    
    public function __construct() {
        $this->response_helper = new Bazarbuy_Response();
    }
    
    /**
     * GET /wp-json/cabinet/v1/chat/history
     */
    public function get_history(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        if (!$user_id) {
            return $this->response_helper->error_response('unauthorized', 'Authentication required', 401);
        }
        
        // Получаем историю из post meta или отдельной таблицы
        // Здесь упрощённая версия — можно хранить в post_meta заказа
        // или создать отдельную таблицу wp_bazarbuy_chat_messages
        
        $limit = (int)$request->get_param('limit') ?: 50;
        $offset = (int)$request->get_param('offset') ?: 0;
        
        // TODO: Реализовать получение из базы данных
        // Пока возвращаем пустой массив или данные из post_meta
        
        return $this->response_helper->success_response([]);
    }
    
    /**
     * POST /wp-json/cabinet/v1/chat/send
     */
    public function send_message(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        if (!$user_id) {
            return $this->response_helper->error_response('unauthorized', 'Authentication required', 401);
        }
        
        $text = $request->get_param('text');
        $order_id = $request->get_param('orderId');
        $client_id = get_user_meta($user_id, 'bazarbuy_client_id', true);
        
        if (empty($text)) {
            return $this->response_helper->error_response('validation_error', 'Text is required', 400);
        }
        
        // Создаём сообщение
        $message_id = 'msg_' . time() . '_' . $user_id;
        $message = [
            'id' => $message_id,
            'sender' => 'client',
            'text' => sanitize_text_field($text),
            'createdAt' => current_time('c'),
            'orderId' => $order_id,
            'status' => 'delivered'
        ];
        
        // TODO: Сохранить в базу данных
        
        // Отправить уведомление в Telegram
        $this->send_telegram_notification([
            'type' => 'MESSAGE',
            'clientId' => $client_id,
            'clientName' => get_user_meta($user_id, 'bazarbuy_name', true),
            'text' => $text,
            'orderId' => $order_id
        ]);
        
        return $this->response_helper->success_response([
            'success' => true,
            'messageId' => $message_id
        ]);
    }
    
    /**
     * Отправка уведомления в Telegram
     */
    private function send_telegram_notification($data) {
        // TODO: Интегрировать с Telegram Bot API
        // Пока просто логируем
        error_log('[BazarBuy Chat] Telegram notification: ' . json_encode($data));
    }
}
```

#### 3.2 WordPress плагин: Добавить Telegram Controller

**Создать файл:** `includes/api/class-telegram-controller.php`

**Содержимое:**

```php
<?php

class Bazarbuy_Telegram_Controller {
    private $response_helper;
    
    public function __construct() {
        $this->response_helper = new Bazarbuy_Response();
    }
    
    /**
     * POST /wp-json/cabinet/v1/telegram/notify
     */
    public function notify(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        if (!$user_id) {
            return $this->response_helper->error_response('unauthorized', 'Authentication required', 401);
        }
        
        $type = $request->get_param('type');
        $data = $request->get_json_params();
        
        // Форматирование сообщения (можно вынести в отдельный метод)
        $client_id = get_user_meta($user_id, 'bazarbuy_client_id', true);
        $client_name = get_user_meta($user_id, 'bazarbuy_name', true);
        $client_city = get_user_meta($user_id, 'bazarbuy_city', true);
        
        // TODO: Интегрировать с Telegram Bot API
        // Формат сообщения должен соответствовать formatTelegramMessage() из cabinet-api.js
        
        return $this->response_helper->success_response(['success' => true]);
    }
}
```

#### 3.3 WordPress плагин: Зарегистрировать новые endpoints

**Файл:** `bazarbuy-cabinet.php`

**В методе регистрации routes добавить:**

```php
// Chat endpoints
$chat_controller = new Bazarbuy_Chat_Controller();
register_rest_route('cabinet/v1', '/chat/history', [
    'methods' => 'GET',
    'callback' => [$chat_controller, 'get_history'],
    'permission_callback' => [$this, 'check_jwt_permission']
]);

register_rest_route('cabinet/v1', '/chat/send', [
    'methods' => 'POST',
    'callback' => [$chat_controller, 'send_message'],
    'permission_callback' => [$this, 'check_jwt_permission']
]);

// Telegram endpoint
$telegram_controller = new Bazarbuy_Telegram_Controller();
register_rest_route('cabinet/v1', '/telegram/notify', [
    'methods' => 'POST',
    'callback' => [$telegram_controller, 'notify'],
    'permission_callback' => [$this, 'check_jwt_permission']
]);
```

**Результат:** Фронтенд остаётся без изменений, все методы уже реализованы.

---

### ⚡ ЭТАП 4: УЛУЧШЕНИЯ (НИЗКИЙ ПРИОРИТЕТ) — Постепенно

#### 4.1 Единый формат ответов

**WordPress плагин:** Использовать `Bazarbuy_Response` класс для всех ответов:

```php
// Вместо:
return new WP_REST_Response($data, 200);

// Использовать:
return $this->response_helper->success_response($data);
// или
return $this->response_helper->error_response('code', 'message', 400);
```

**Фронтенд:** Адаптировать обработку ошибок в `request()`:

```javascript
if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Единый формат WordPress: { success: false, error: { code, message } }
    if (errorData.error && errorData.error.code) {
        throw new Error(errorData.error.message || errorData.error.code);
    }
    
    throw new Error(errorData.message || `HTTP ${response.status}`);
}
```

#### 4.2 OpenAPI документация

**Действие:** Уже есть файл `openapi.yaml` в плагине. Проверить актуальность и обновить при необходимости.

#### 4.3 Публичный каталог

**WordPress плагин:** Endpoint `/catalog/v1/products` уже есть. Можно использовать для интеграции с каталогом товаров (не критично для кабинета).

---

## 🔄 МЕХАНИЗМ ПОСТЕПЕННОГО ПЕРЕХОДА

### Стратегия "Feature Flag" для каждого endpoint

**Файл:** `frontend/cabinet/cabinet-api.js`

**Добавить в CONFIG:**

```javascript
const CONFIG = {
    baseURL: '/wp-json/cabinet/v1',
    useMock: true,  // Глобальный флаг
    
    // Флаги для каждого endpoint (для постепенного перехода)
    endpointsMode: {
        auth: 'wp',        // 'wp' | 'mock' | 'auto'
        profile: 'auto',   // 'auto' использует useMock если true
        orders: 'auto',
        chat: 'auto',
        telegram: 'auto'
    },
    
    // ...
};
```

**Изменить функцию `request()`:**

```javascript
async function request(method, endpoint, data = null) {
    // Определяем, какой режим использовать для этого endpoint
    let useMockForThisRequest = CONFIG.useMock;
    
    // Можно переопределить для конкретного endpoint
    if (endpoint.startsWith('/auth/')) {
        useMockForThisRequest = CONFIG.endpointsMode.auth === 'mock' || 
                                (CONFIG.endpointsMode.auth === 'auto' && CONFIG.useMock);
    }
    // ... аналогично для других
    
    if (useMockForThisRequest) {
        return mockRequest(method, endpoint, data);
    }
    
    // Реальный запрос...
}
```

**Преимущество:** Можно переводить endpoints по одному, остальные остаются в mock.

---

## 📝 КОНКРЕТНЫЕ ИЗМЕНЕНИЯ В ФАЙЛАХ

### Frontend: `frontend/cabinet/cabinet-api.js`

#### Изменение 1 (строка 32):
```diff
- authCheck: '/auth/check',
+ authCheck: '/auth/me',
```

#### Изменение 2 (после строки 265, внутри `request()`):
```javascript
if (!response.ok) {
    // Обработка 401 (токен истёк)
    if (response.status === 401) {
        setAuthToken(null);
        window.dispatchEvent(new CustomEvent('cabinet:auth-expired'));
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error?.message || 'Сессия истекла. Войдите снова.');
    }
    // ... остальной код
}
```

#### Изменение 3 (строка 477-479, метод `checkAuth()`):
```javascript
async checkAuth() {
    try {
        const result = await request('GET', CONFIG.endpoints.authCheck);
        
        // Адаптация формата WordPress
        if (result.success === false) {
            return { isAuthenticated: false, user: null };
        }
        
        if (result.id || result.email) {
            return { isAuthenticated: true, user: result };
        }
        
        if (result.isAuthenticated !== undefined) {
            return result;
        }
        
        return { isAuthenticated: false, user: null };
    } catch (error) {
        return { isAuthenticated: false, user: null };
    }
},
```

### Frontend: `frontend/cabinet/cabinet-store.js`

#### Изменение (после строки 136, в секции событий):
```javascript
// Слушаем истечение токена
window.addEventListener('cabinet:auth-expired', () => {
    setState(s => ({
        ...s,
        client: { ...initialState.client },
        system: { ...s.system, error: 'Сессия истекла. Войдите снова.' }
    }));
    emitEvent(EVENTS.AUTH_CHANGED, { isAuthenticated: false });
});
```

---

## 🧪 ПЛАН ТЕСТИРОВАНИЯ

### Тест 1: Локально с mock-режимом
```javascript
// В cabinet-api.js:
CONFIG.useMock = true;

// Проверки:
1. Открыть кабинет → должна работать авторизация
2. Войти → должен сохраниться токен
3. Проверить профиль → данные загружаются
4. Создать заказ → работает
```

### Тест 2: Локально с WordPress (Docker/Local)
```javascript
// В cabinet-api.js:
CONFIG.useMock = false;
CONFIG.baseURL = 'http://localhost/wp/wp-json/cabinet/v1';

// Проверки:
1. curl http://localhost/wp/wp-json/cabinet/v1/auth/me
2. Регистрация через API
3. Вход через API
4. Проверка JWT токена
5. Получение профиля
6. Создание заказа
```

### Тест 3: На staging с реальным WordPress
```javascript
// В cabinet-api.js:
CONFIG.useMock = false;
CONFIG.baseURL = 'https://staging.bazarbuy.store/wp/wp-json/cabinet/v1';

// Проверки:
1. Все endpoints работают
2. 401 обрабатывается корректно
3. Rate limiting срабатывает
4. CORS настроен правильно
```

---

## ⚠️ РИСКИ И МИТИГАЦИЯ

### Риск 1: Несовместимость форматов ответов
**Митигация:** 
- Добавить адаптеры в `checkAuth()` и других методах
- Поддержать оба формата (старый и новый) во время перехода

### Риск 2: JWT токены истекают неожиданно
**Митигация:**
- Обработка 401 с автоматической очисткой токена
- Событие `cabinet:auth-expired` для перехода на страницу входа

### Риск 3: Чат/Telegram endpoints отсутствуют в WordPress
**Митигация:**
- Постепенное добавление endpoints
- Временное использование mock для этих функций

### Риск 4: Срок жизни токенов разный
**Митигация:**
- Синхронизировать настройки JWT в WordPress и логику обновления на frontend
- Рекомендуемый срок: 7 дней (можно продлить до 30)

---

## ✅ ЧЕКЛИСТ ВНЕДРЕНИЯ

### День 1 (Безопасность):
- [ ] Изменён endpoint `/auth/check` → `/auth/me`
- [ ] Добавлена обработка 401 в `request()`
- [ ] Добавлен обработчик `cabinet:auth-expired` в CabinetStore
- [ ] Адаптирован формат ответа в `checkAuth()`
- [ ] Настроен `BAZARBUY_JWT_SECRET` в `wp-config.php`
- [ ] Проверена работа rate limiting
- [ ] Настроен CORS для локальной разработки
- [ ] Тест: Mock-режим продолжает работать
- [ ] Тест: Реальный API с `/auth/me` работает

### День 2 (Профиль):
- [ ] Вариант А: Добавлен `/user/client` endpoint в WordPress
- [ ] ИЛИ Вариант Б: Адаптирован `getClient()` для двух запросов
- [ ] Тест: Профиль загружается корректно

### День 3 (Чат и Telegram):
- [ ] Создан `class-chat-controller.php`
- [ ] Создан `class-telegram-controller.php`
- [ ] Зарегистрированы endpoints в главном файле плагина
- [ ] Тест: Чат работает
- [ ] Тест: Telegram уведомления отправляются

### Постепенно (Улучшения):
- [ ] Единый формат ответов внедрён
- [ ] OpenAPI документация обновлена
- [ ] Публичный каталог подключён (если нужно)

---

## 📊 ПРИОРИТЕТЫ

### 🔴 ВЫСОКИЙ (без этого не работает):
1. ✅ `/auth/me` вместо `/auth/check`
2. ✅ Обработка 401 и JWT expiration
3. ✅ Адаптация формата ответов
4. ✅ Настройка JWT secret

### 🟡 СРЕДНИЙ (функциональность):
1. ✅ `/user/client` endpoint в WordPress
2. ✅ Chat endpoints в WordPress
3. ✅ Telegram endpoint в WordPress

### 🟢 НИЗКИЙ (улучшения):
1. Единый формат ответов
2. OpenAPI документация
3. Публичный каталог

---

## 🔐 БЕЗОПАСНОСТЬ

### JWT токены:
- Хранение: `localStorage` (текущее) или `sessionStorage` (безопаснее)
- Обновление: Автоматическое при каждом успешном запросе (если WordPress поддерживает refresh tokens)
- Истечение: Обработка 401 с переходом на страницу входа

### Rate limiting:
- По умолчанию: 5 попыток / 15 минут для `/auth/login`
- Можно настроить в WordPress плагине

### CORS:
- Разрешены домены: `www.bazarbuy.store`, `bazarbuy.store`, `localhost:*` (для разработки)
- Настроить в `bazarbuy-cabinet.php` → `add_cors_headers()`

---

## 📝 ИТОГОВАЯ СТРАТЕГИЯ

**Принцип:** Минимальные изменения, максимальная совместимость

1. **Frontend изменения:** Только критичные (endpoint и обработка 401)
2. **WordPress изменения:** Добавление недостающих endpoints (chat, telegram, /user/client)
3. **Mock-режим:** Сохраняется полностью для разработки
4. **Постепенный переход:** Можно переводить endpoints по одному

**Результат:** Гибридная система, работающая и в mock, и с WordPress, с сохранением всей функциональности.



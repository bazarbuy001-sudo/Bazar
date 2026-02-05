# 🚀 ЭТАП 2: Установка и тестирование `/user/client` endpoint

**Цель:** Установить контроллер в WordPress плагин и протестировать работу endpoint.

---

## 📋 ПРЕДВАРИТЕЛЬНЫЕ ПРОВЕРКИ

### ✅ Проверка ЭТАПА 1

Перед установкой ЭТАПА 2 убедитесь, что ЭТАП 1 выполнен:

1. **JWT секрет настроен** в `wp-config.php`:
   ```php
   define('BAZARBUY_JWT_SECRET', 'BazarBuy2026_...');
   ```

2. **Endpoint `/auth/login` работает:**
   ```bash
   curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```
   Ожидается: `200 OK` с токеном

3. **Endpoint `/auth/me` работает:**
   ```bash
   curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Ожидается: `200 OK` или `401 Unauthorized`

4. **CORS настроен** (для локальной разработки):
   - `http://localhost:3000`
   - `http://localhost:8080`
   - `http://127.0.0.1:5500`

---

## 🔧 УСТАНОВКА КОНТРОЛЛЕРА

### Шаг 1: Копирование файла

**Источник:**
```
fabric-store/wordpress-plugin/includes/api/class-user-controller.php
```

**Назначение (на сервере WordPress):**
```
wp-content/plugins/bazarbuy-cabinet/includes/api/class-user-controller.php
```

**Способ копирования:**

#### Вариант А: Через FTP/SFTP
1. Подключитесь к серверу через FTP клиент (FileZilla, WinSCP)
2. Перейдите в папку `wp-content/plugins/bazarbuy-cabinet/includes/api/`
3. Загрузите файл `class-user-controller.php`

#### Вариант Б: Через SSH
```bash
# На вашем локальном компьютере:
scp wordpress-plugin/includes/api/class-user-controller.php user@server:/path/to/wp-content/plugins/bazarbuy-cabinet/includes/api/
```

#### Вариант В: Через панель хостинга (cPanel, Plesk)
1. Откройте файловый менеджер
2. Перейдите в `wp-content/plugins/bazarbuy-cabinet/includes/api/`
3. Загрузите файл `class-user-controller.php`

---

### Шаг 2: Проверка структуры файлов

После копирования проверьте структуру:

```
wp-content/plugins/bazarbuy-cabinet/
├── bazarbuy-cabinet.php (главный файл)
├── includes/
│   ├── api/
│   │   ├── class-user-controller.php  ← НОВЫЙ ФАЙЛ
│   │   ├── class-profile-controller.php
│   │   └── ...
│   └── ...
└── ...
```

---

### Шаг 3: Подключение контроллера в главном файле плагина

Откройте файл **`bazarbuy-cabinet.php`** в редакторе кода.

#### 3.1 Найти секцию подключения контроллеров

Ищите строки вида:
```php
require_once plugin_dir_path(__FILE__) . 'includes/api/class-profile-controller.php';
require_once plugin_dir_path(__FILE__) . 'includes/api/class-auth-controller.php';
```

#### 3.2 Добавить подключение нового контроллера

**Добавьте после существующих require_once:**
```php
require_once plugin_dir_path(__FILE__) . 'includes/api/class-user-controller.php';
```

**Пример полной секции:**
```php
// Подключение контроллеров API
require_once plugin_dir_path(__FILE__) . 'includes/api/class-auth-controller.php';
require_once plugin_dir_path(__FILE__) . 'includes/api/class-profile-controller.php';
require_once plugin_dir_path(__FILE__) . 'includes/api/class-user-controller.php'; // ← НОВЫЙ
```

---

### Шаг 4: Создание экземпляра контроллера

#### 4.1 Найти место создания контроллеров

Ищите строки вида:
```php
$auth_controller = new Bazarbuy_Auth_Controller();
$profile_controller = new Bazarbuy_Profile_Controller();
```

#### 4.2 Добавить создание экземпляра

**Добавьте после существующих:**
```php
$user_controller = new Bazarbuy_User_Controller();
```

**Пример:**
```php
// Создание экземпляров контроллеров
$auth_controller = new Bazarbuy_Auth_Controller();
$profile_controller = new Bazarbuy_Profile_Controller();
$user_controller = new Bazarbuy_User_Controller(); // ← НОВЫЙ
```

---

### Шаг 5: Регистрация маршрутов

#### Вариант А: Если используется хук `rest_api_init`

**Найдите хук:**
```php
add_action('rest_api_init', function() use ($auth_controller, $profile_controller) {
    $auth_controller->register_routes();
    $profile_controller->register_routes();
});
```

**Измените на:**
```php
add_action('rest_api_init', function() use ($auth_controller, $profile_controller, $user_controller) {
    $auth_controller->register_routes();
    $profile_controller->register_routes();
    $user_controller->register_routes(); // ← НОВЫЙ
});
```

#### Вариант Б: Если используется метод класса

**Найдите метод регистрации:**
```php
public function register_routes() {
    $this->auth_controller->register_routes();
    $this->profile_controller->register_routes();
}
```

**Добавьте:**
```php
public function register_routes() {
    $this->auth_controller->register_routes();
    $this->profile_controller->register_routes();
    $this->user_controller->register_routes(); // ← НОВЫЙ
}
```

#### Вариант В: Прямая регистрация (если нужно)

**Добавьте в любой подходящий метод:**
```php
register_rest_route('cabinet/v1', '/user/client', [
    'methods'             => 'GET',
    'callback'            => [$user_controller, 'get_client'],
    'permission_callback' => [$user_controller, 'check_auth'],
]);
```

---

### Шаг 6: Проверка синтаксиса PHP

**Важно:** Проверьте синтаксис PHP перед активацией:

```bash
# Через SSH на сервере:
php -l wp-content/plugins/bazarbuy-cabinet/includes/api/class-user-controller.php

# Ожидается: "No syntax errors detected"
```

**Или через WordPress:**
- Откройте админ-панель WordPress
- Перейдите в "Плагины"
- Найдите плагин `BazarBuy Cabinet`
- Если есть ошибки синтаксиса — они отобразятся

---

### Шаг 7: Сброс постоянных ссылок

После добавления нового endpoint необходимо сбросить постоянные ссылки:

#### Через WordPress Admin:
1. Перейдите в **Настройки → Постоянные ссылки**
2. Нажмите **"Сохранить изменения"** (без изменений)

#### Через WP-CLI (если доступен):
```bash
wp rewrite flush
```

#### Через PHP (временно в functions.php):
```php
flush_rewrite_rules();
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Тест А: Проверка доступности endpoint (без авторизации)

**Команда:**
```bash
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client \
  -H "Content-Type: application/json"
```

**Ожидаемый результат:**
```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "Authentication required"
  }
}
```
**Статус:** `401 Unauthorized`

**Если получили:**
- `404 Not Found` → Endpoint не зарегистрирован (проверьте Шаг 5)
- `500 Internal Server Error` → Ошибка в коде (проверьте синтаксис)

---

### Тест Б: Получение JWT токена

**Команда:**
```bash
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "ваш_пароль"
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "1",
    "email": "test@example.com",
    ...
  }
}
```
**Статус:** `200 OK`

**Сохраните токен для следующего теста:**
```bash
# Сохранить токен в переменную (Linux/Mac):
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

# Windows PowerShell:
$TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

---

### Тест В: Получение данных клиента с токеном

**Команда (Linux/Mac):**
```bash
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Команда (Windows PowerShell):**
```powershell
curl.exe -X GET "https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json"
```

**Команда (с явным токеном):**
```bash
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client \
  -H "Authorization: Bearer ВАШ_JWT_ТОКЕН_ЗДЕСЬ" \
  -H "Content-Type: application/json"
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "clientId": "BB-00001",
    "email": "test@example.com",
    "authProvider": "email",
    "emailVerified": false,
    "name": "Test User",
    "city": "",
    "phone": "",
    "isAuthenticated": true,
    "isFirstLogin": true,
    "createdAt": "2025-01-10T10:22:00+00:00",
    "lastLoginAt": null
  }
}
```
**Статус:** `200 OK`

**Проверьте:**
- ✅ `success: true`
- ✅ Объект `data` присутствует
- ✅ `id` и `clientId` заполнены
- ✅ `email` совпадает с логином
- ✅ `isAuthenticated: true`

---

### Тест Г: Проверка через фронтенд (браузер)

#### 1. Настройка фронтенда

**Откройте файл:** `frontend/cabinet/cabinet-api.js`

**Измените (временно для теста):**
```javascript
const CONFIG = {
    baseURL: 'https://ваш-домен.com/wp/wp-json/cabinet/v1',  // ← Ваш домен
    useMock: false,  // ← Отключить mock для теста
    // ...
};
```

#### 2. Откройте кабинет в браузере

```
http://localhost:5500/frontend/cabinet/index.html
```

#### 3. Откройте консоль разработчика (F12)

**Проверьте:**
- ✅ Нет ошибок в консоли
- ✅ Нет ошибок 404, 401, 500
- ✅ Логи: `[CabinetAPI] GET /user/client`

#### 4. Проверьте данные в state

**В консоли браузера:**
```javascript
// Проверить состояние кабинета
const state = CabinetStore._getState();
console.log('Client data:', state.client);

// Ожидаемый результат:
// {
//   id: "1",
//   clientId: "BB-00001",
//   email: "test@example.com",
//   isAuthenticated: true,
//   ...
// }
```

#### 5. Проверьте обработку истечения токена

**В консоли браузера:**
```javascript
// Симуляция истечения токена
window.dispatchEvent(new CustomEvent('cabinet:auth-expired'));

// Ожидаемый результат:
// - Сообщение: "Сессия истекла. Войдите снова."
// - state.client сброшен
// - state.system.error заполнен
```

---

### Тест Д: Проверка генерации clientId

**Проверьте, что clientId генерируется автоматически:**

1. Создайте нового пользователя через `/auth/register`
2. Вызовите `/user/client` для этого пользователя
3. Проверьте, что `clientId` имеет формат `BB-00001`, `BB-00002` и т.д.

---

## ⚠️ РЕШЕНИЕ ПРОБЛЕМ

### Проблема 1: 404 Not Found

**Симптомы:**
```json
{
  "code": "rest_no_route",
  "message": "No route was found matching the URL and request method."
}
```

**Решение:**
1. Проверьте, что файл скопирован в правильную папку
2. Проверьте, что `require_once` добавлен в главный файл
3. Проверьте, что `register_routes()` вызван
4. Выполните сброс постоянных ссылок: `wp rewrite flush`

---

### Проблема 2: 500 Internal Server Error

**Симптомы:**
```json
{
  "code": "internal_server_error",
  "message": "There has been a critical error on this website."
}
```

**Решение:**
1. Проверьте синтаксис PHP:
   ```bash
   php -l class-user-controller.php
   ```
2. Проверьте логи ошибок WordPress:
   - `wp-content/debug.log`
   - Или включите `WP_DEBUG` в `wp-config.php`
3. Проверьте, что класс `Bazarbuy_Response` существует и доступен

---

### Проблема 3: 401 Unauthorized с валидным токеном

**Симптомы:**
```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "Authentication required"
  }
}
```

**Решение:**
1. Проверьте формат заголовка:
   ```
   Authorization: Bearer TOKEN
   ```
   (не `Token TOKEN` и не `BearerTOKEN`)

2. Проверьте JWT токен — он должен быть актуальным

3. Проверьте метод `check_auth()` — возможно, он использует неправильную проверку JWT

4. Добавьте логирование в `check_auth()`:
   ```php
   public function check_auth() {
       error_log('User ID: ' . get_current_user_id());
       return is_user_logged_in();
   }
   ```

---

### Проблема 4: Формат ответа не совпадает с фронтендом

**Симптомы:**
- Фронтенд не может распарсить ответ
- Ошибки в консоли: "Cannot read property 'clientId' of undefined"

**Решение:**
1. Проверьте формат ответа через CURL
2. Убедитесь, что используется `Bazarbuy_Response::success_response()`
3. При необходимости адаптируйте `getClient()` в `cabinet-api.js`:
   ```javascript
   async getClient() {
       const result = await request('GET', CONFIG.endpoints.client);
       
       // Если WordPress вернул { success, data }
       if (result.success && result.data) {
           return result.data;
       }
       
       // Если напрямую объект
       return result;
   }
   ```

---

### Проблема 5: Class 'Bazarbuy_Response' not found

**Симптомы:**
```
Fatal error: Uncaught Error: Class 'Bazarbuy_Response' not found
```

**Решение:**
1. Проверьте, что класс `Bazarbuy_Response` существует в плагине
2. Проверьте, что он подключён до создания `Bazarbuy_User_Controller`
3. Если класс называется иначе, измените в конструкторе:
   ```php
   // Если класс называется Bazarbuy_Response_Helper:
   $this->response = new Bazarbuy_Response_Helper();
   ```

---

## ✅ КРИТЕРИИ ЗАВЕРШЕНИЯ ЭТАПА 2

**ЭТАП 2 считается завершённым, если:**

- [x] Файл `class-user-controller.php` скопирован в плагин
- [x] Контроллер подключён через `require_once`
- [x] Экземпляр контроллера создан
- [x] Маршруты зарегистрированы
- [x] Endpoint доступен: `200 OK` с токеном, `401` без токена
- [x] Данные возвращаются в правильном формате
- [x] `clientId` генерируется автоматически
- [x] Фронтенд работает без ошибок (при `useMock = false`)
- [x] Обработка `401` срабатывает через `cabinet:auth-expired`
- [x] Mock-режим продолжает работать (при `useMock = true`)

---

## 🚀 ПОДГОТОВКА К ЭТАПУ 3

После успешного завершения ЭТАПА 2 можно переходить к ЭТАПУ 3.

### Что будет в ЭТАПЕ 3:

1. **Chat Controller** (`class-chat-controller.php`):
   - `GET /chat/history` — история сообщений
   - `POST /chat/send` — отправка сообщения

2. **Telegram Controller** (`class-telegram-controller.php`):
   - `POST /telegram/notify` — уведомление в Telegram

### Преимущества:

- ✅ Фронтенд **уже готов** — все endpoints используются в `cabinet-api.js`
- ✅ Mock-режим **продолжит работать** для разработки
- ✅ Постепенный переход — можно подключать endpoints по одному

---

## 📝 ЧЕКЛИСТ УСТАНОВКИ

**Выполните все пункты:**

- [ ] Скопирован файл `class-user-controller.php`
- [ ] Добавлен `require_once` в главный файл плагина
- [ ] Создан экземпляр `$user_controller`
- [ ] Вызван `$user_controller->register_routes()`
- [ ] Проверен синтаксис PHP
- [ ] Выполнен сброс постоянных ссылок
- [ ] Протестирован endpoint через CURL (без токена → 401)
- [ ] Получен JWT токен через `/auth/login`
- [ ] Протестирован endpoint через CURL (с токеном → 200)
- [ ] Проверен формат ответа (наличие `success` и `data`)
- [ ] Протестирован фронтенд (браузер, консоль, state)
- [ ] Проверена обработка `cabinet:auth-expired`
- [ ] Проверена генерация `clientId`

---

## 🎯 ГОТОВЫЕ КОМАНДЫ ДЛЯ БЫСТРОГО ТЕСТА

**Полный цикл тестирования одной командой (Linux/Mac):**

```bash
# 1. Получить токен
TOKEN=$(curl -s -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Использовать токен для получения данных
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

**Windows PowerShell:**
```powershell
# 1. Получить токен
$response = Invoke-RestMethod -Uri "https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"password"}'
$TOKEN = $response.token

# 2. Использовать токен
Invoke-RestMethod -Uri "https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client" `
  -Method GET `
  -Headers @{"Authorization"="Bearer $TOKEN"} | ConvertTo-Json -Depth 10
```

---

## 📞 ДОПОЛНИТЕЛЬНАЯ ПОМОЩЬ

Если возникли проблемы, проверьте:

1. **Документация установки:**
   - `wordpress-plugin/ETAP_2_INSTALLATION_GUIDE.md`

2. **Общий план интеграции:**
   - `WORDPRESS_INTEGRATION_PLAN.md`

3. **Отчёт о выполнении:**
   - `ETAP_2_INTEGRATION_COMPLETE.md`

4. **Логи WordPress:**
   - Включите `WP_DEBUG` в `wp-config.php`
   - Проверьте `wp-content/debug.log`

---

**Удачи с установкой! После успешного тестирования — переходим к ЭТАПУ 3! 🚀**



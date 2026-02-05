# 🚀 ФИНАЛЬНЫЙ ПЛАН ВНЕДРЕНИЯ — Полная установка всех компонентов

**Версия:** 3.0.0  
**Дата:** 2026-01-XX  
**Статус:** Production Ready

---

## 📋 ОБЗОР УСТАНОВКИ

Этот гайд описывает полную установку всех компонентов WordPress плагина для чата и коммуникаций:

- ✅ ЭТАП 1: Безопасность (JWT, rate limiting)
- ✅ ЭТАП 2: Профиль пользователя
- ✅ ЭТАП 3: Чат и Telegram уведомления
- ✅ Фаза 2: Админ-чат для менеджеров
- ✅ Фаза 3: Telegram Webhook (двусторонний мост)

---

## 📦 СПИСОК ФАЙЛОВ ДЛЯ УСТАНОВКИ

### Основные контроллеры:

1. ✅ `includes/api/class-auth-controller.php` (ЭТАП 1)
2. ✅ `includes/api/class-user-controller.php` (ЭТАП 2)
3. ✅ `includes/api/class-chat-controller.php` (ЭТАП 3)
4. ✅ `includes/api/class-telegram-controller.php` (ЭТАП 3)

### Расширенные контроллеры:

5. ✅ `includes/api/class-admin-chat-controller.php` (Фаза 2)
6. ✅ `includes/api/class-telegram-webhook-controller.php` (Фаза 3)

### Вспомогательные файлы:

7. ✅ `includes/db/class-chat-db.php` (Абстракция БД)
8. ✅ `admin-ui/admin-chat.js` (UI для админ-чата)
9. ✅ `migrations/001_create_chat_tables.sql` (SQL миграции)

---

## 🔧 ШАГ 1: КОПИРОВАНИЕ ФАЙЛОВ

### Вариант А: Через FTP/SFTP

1. Подключитесь к серверу через FTP клиент (FileZilla, WinSCP)
2. Перейдите в папку WordPress плагина:
   ```
   wp-content/plugins/bazarbuy-cabinet/
   ```

3. Создайте структуру папок (если не существует):
   ```
   bazarbuy-cabinet/
   ├── includes/
   │   ├── api/
   │   └── db/
   ├── admin-ui/
   └── migrations/
   ```

4. Скопируйте файлы:
   - `includes/api/` → все PHP контроллеры
   - `includes/db/` → `class-chat-db.php`
   - `admin-ui/` → `admin-chat.js`
   - `migrations/` → `001_create_chat_tables.sql`

### Вариант Б: Через SSH

```bash
# На локальном компьютере
cd wordpress-plugin/etap-3

# Копирование всех файлов
scp -r includes/ user@server:/path/to/wp-content/plugins/bazarbuy-cabinet/
scp -r admin-ui/ user@server:/path/to/wp-content/plugins/bazarbuy-cabinet/
scp -r migrations/ user@server:/path/to/wp-content/plugins/bazarbuy-cabinet/
```

### Вариант В: Через панель хостинга (cPanel/Plesk)

1. Откройте файловый менеджер
2. Перейдите в `wp-content/plugins/bazarbuy-cabinet/`
3. Создайте папки: `includes/api/`, `includes/db/`, `admin-ui/`, `migrations/`
4. Загрузите файлы в соответствующие папки

---

## 🔌 ШАГ 2: ПОДКЛЮЧЕНИЕ В ГЛАВНОМ ФАЙЛЕ ПЛАГИНА

Откройте главный файл плагина: **`bazarbuy-cabinet.php`**

### 2.1 Подключение всех контроллеров

**Добавьте в начало файла (после комментариев плагина):**

```php
<?php
/**
 * Plugin Name: BazarBuy Cabinet
 * Description: Личный кабинет BazarBuy с чатом и коммуникациями
 * Version: 3.0.0
 * Author: BazarBuy
 */

// Предотвращение прямого доступа
if (!defined('ABSPATH')) {
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОДКЛЮЧЕНИЕ ВСЕХ КОНТРОЛЛЕРОВ
// ═══════════════════════════════════════════════════════════════════════════

// ЭТАП 1: Безопасность и аутентификация
require_once plugin_dir_path(__FILE__) . 'includes/api/class-auth-controller.php';

// ЭТАП 2: Профиль пользователя
require_once plugin_dir_path(__FILE__) . 'includes/api/class-user-controller.php';

// ЭТАП 3: Чат и уведомления
require_once plugin_dir_path(__FILE__) . 'includes/db/class-chat-db.php';
require_once plugin_dir_path(__FILE__) . 'includes/api/class-chat-controller.php';
require_once plugin_dir_path(__FILE__) . 'includes/api/class-telegram-controller.php';

// Фаза 2: Админ-чат для менеджеров
require_once plugin_dir_path(__FILE__) . 'includes/api/class-admin-chat-controller.php';

// Фаза 3: Telegram Webhook (двусторонний мост)
require_once plugin_dir_path(__FILE__) . 'includes/api/class-telegram-webhook-controller.php';
```

### 2.2 Регистрация REST API endpoints

**Добавьте после подключения контроллеров:**

```php
// ═══════════════════════════════════════════════════════════════════════════
// РЕГИСТРАЦИЯ REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', function() {
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
});
```

### 2.3 Создание страницы админ-чата

**Добавьте после регистрации endpoints:**

```php
// ═══════════════════════════════════════════════════════════════════════════
// СОЗДАНИЕ СТРАНИЦЫ АДМИН-ЧАТА В WORDPRESS
// ═══════════════════════════════════════════════════════════════════════════

add_action('admin_menu', function() {
    add_menu_page(
        'Чат с клиентами BazarBuy',          // Заголовок страницы
        'BazarBuy Чат',                      // Название в меню
        'manage_options',                    // Права доступа
        'bazarbuy-chat',                     // Slug страницы
        'bazarbuy_chat_admin_page_callback', // Функция отображения
        'dashicons-format-chat',             // Иконка
        30                                   // Позиция в меню
    );
});

/**
 * Callback функция для страницы админ-чата
 */
function bazarbuy_chat_admin_page_callback() {
    // Проверка прав доступа
    if (!current_user_can('manage_options')) {
        wp_die('У вас нет прав для доступа к этой странице.');
    }
    
    ?>
    <div class="wrap">
        <h1>💬 Чат с клиентами BazarBuy</h1>
        <div id="bazarbuy-chat-app"></div>
    </div>
    
    <style>
        /* Базовые стили для админ-чата */
        #bazarbuy-chat-app {
            margin-top: 20px;
        }
        .bazarbuy-admin-chat {
            display: flex;
            height: calc(100vh - 200px);
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
        }
        .chat-sidebar {
            width: 300px;
            border-right: 1px solid #ddd;
            overflow-y: auto;
            background: #f9f9f9;
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
        .chat-input-area {
            padding: 15px;
            border-top: 1px solid #ddd;
            background: #fff;
        }
        .thread-item {
            padding: 12px;
            border-bottom: 1px solid #ddd;
            cursor: pointer;
        }
        .thread-item:hover {
            background: #f0f0f0;
        }
        .thread-item.active {
            background: #e3f2fd;
        }
    </style>
    
    <script>
        // Конфигурация для админ-чата
        window.bazarbuyChatConfig = {
            apiBase: '<?php echo esc_js(rest_url('cabinet/v1/admin/chat')); ?>',
            nonce: '<?php echo esc_js(wp_create_nonce('wp_rest')); ?>'
        };
    </script>
    
    <script src="<?php echo esc_url(plugin_dir_url(__FILE__) . 'admin-ui/admin-chat.js'); ?>"></script>
    <?php
}
```

---

## ⚙️ ШАГ 3: КОНФИГУРАЦИЯ wp-config.php

Добавьте в файл **`wp-config.php`** (перед строкой `/* That's all, stop editing! */`):

```php
// ═══════════════════════════════════════════════════════════════════════════
// НАСТРОЙКИ BazarBuy Cabinet Plugin
// ═══════════════════════════════════════════════════════════════════════════

// JWT Secret для аутентификации (обязательно!)
// Генерируйте случайную строку минимум 32 символа
define('BAZARBUY_JWT_SECRET', 'bazarbuy_' . bin2hex(random_bytes(16)) . '_secret_2026');

// Режимы работы (по умолчанию - mock для разработки)
define('BAZARBUY_CHAT_USE_DB', false);           // false = transients, true = MySQL
define('BAZARBUY_TELEGRAM_ENABLED', false);      // false = только логирование, true = реальная отправка

// Telegram настройки (если BAZARBUY_TELEGRAM_ENABLED = true)
define('BAZARBUY_TELEGRAM_BOT_TOKEN', '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz');
define('BAZARBUY_TELEGRAM_CHAT_ID', '-1001234567890');
define('BAZARBUY_TELEGRAM_SECRET_TOKEN', 'your-random-secret-token-for-webhook');

// Отладочный режим (опционально)
if (!defined('WP_DEBUG')) {
    define('WP_DEBUG', false);
}
if (!defined('WP_DEBUG_LOG')) {
    define('WP_DEBUG_LOG', true);  // Логирование в wp-content/debug.log
}
```

**Важно:**
- Замените `BAZARBUY_JWT_SECRET` на уникальную случайную строку
- Для продакшена установите `BAZARBUY_CHAT_USE_DB = true`
- Для продакшена установите `BAZARBUY_TELEGRAM_ENABLED = true`

---

## 🗄️ ШАГ 4: SQL МИГРАЦИЯ (ОПЦИОНАЛЬНО)

Миграция БД нужна только если вы переключаетесь на продакшн режим (`BAZARBUY_CHAT_USE_DB = true`).

### 4.1 Подготовка SQL

1. Откройте файл `migrations/001_create_chat_tables.sql`
2. Замените префикс таблиц `wp_` на ваш (например, `wpabc_`)
3. Проверьте префикс в `wp-config.php`: `$table_prefix`

### 4.2 Выполнение миграции

#### Через phpMyAdmin:
1. Откройте phpMyAdmin
2. Выберите базу данных WordPress
3. Вкладка "SQL"
4. Вставьте содержимое `001_create_chat_tables.sql`
5. Нажмите "Выполнить"

#### Через WP-CLI:
```bash
wp db query < migrations/001_create_chat_tables.sql
```

#### Через MySQL:
```bash
mysql -u username -p database_name < migrations/001_create_chat_tables.sql
```

---

## 📱 ШАГ 5: НАСТРОЙКА TELEGRAM WEBHOOK

### 5.1 Создание Telegram Bot

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Сохраните **Bot Token**

### 5.2 Получение Chat ID

#### Для личного чата:
1. Напишите боту любое сообщение
2. Откройте в браузере:
   ```
   https://api.telegram.org/botВАШ_BOT_TOKEN/getUpdates
   ```
3. Найдите `"chat":{"id":123456789}` — это ваш Chat ID

#### Для группового чата:
1. Добавьте бота в группу
2. Отправьте сообщение в группу
3. Откройте тот же URL
4. Найдите `"chat":{"id":-1001234567890}` (отрицательное число)

### 5.3 Установка Webhook

```bash
curl -X POST "https://api.telegram.org/botВАШ_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://ваш-домен.com/wp/wp-json/cabinet/v1/telegram/webhook",
    "secret_token": "ВАШ_SECRET_TOKEN",
    "max_connections": 40,
    "allowed_updates": ["message", "edited_message"]
  }'
```

**Ожидаемый ответ:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 5.4 Проверка Webhook

```bash
curl "https://api.telegram.org/botВАШ_BOT_TOKEN/getWebhookInfo"
```

---

## 🧪 ШАГ 6: ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ

### Тест 1: Проверка синтаксиса PHP

```bash
# Проверить все файлы
php -l includes/api/class-auth-controller.php
php -l includes/api/class-user-controller.php
php -l includes/api/class-chat-controller.php
php -l includes/api/class-telegram-controller.php
php -l includes/api/class-admin-chat-controller.php
php -l includes/api/class-telegram-webhook-controller.php
php -l includes/db/class-chat-db.php
```

**Ожидается:** `No syntax errors detected`

---

### Тест 2: Основные endpoints (без авторизации)

```bash
# Проверка доступности API
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/

# Проверка авторизации (должен вернуть 401)
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/me

# Проверка чата (должен вернуть 401)
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/history
```

**Ожидается:** `401 Unauthorized` для всех запросов

---

### Тест 3: Получение JWT токена

```bash
# Регистрация или вход
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "your_password"
  }'
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {...}
}
```

**Сохраните токен для следующих тестов:**
```bash
TOKEN="ваш_jwt_токен"
```

---

### Тест 4: Профиль пользователя

```bash
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "clientId": "BB-00001",
    "email": "test@example.com",
    ...
  }
}
```

---

### Тест 5: Отправка сообщения в чат

```bash
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Тестовое сообщение от клиента",
    "orderId": "123"
  }'
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "data": {
    "id": "mock_1234567890_5678",
    "status": "pending"
  }
}
```

**Проверьте логи:**
- В `wp-content/debug.log` должно появиться:
  ```
  [Bazarbuy_Chat_DB Mock] Сохранено сообщение: {...}
  ```

---

### Тест 6: Получение истории чата

```bash
curl -X GET "https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/history?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mock_1234567890_5678",
      "from": "client",
      "text": "Тестовое сообщение от клиента",
      "status": "pending",
      "createdAt": "2025-01-10T12:00:00+00:00",
      "orderId": "123"
    }
  ]
}
```

---

### Тест 7: Админ-чат endpoints (требует админских прав)

```bash
# Получить админский токен (через WordPress admin)
ADMIN_TOKEN="админский_jwt_токен"

# Список диалогов
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/admin/chat/threads \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Сообщения конкретного клиента
curl -X GET "https://ваш-домен.com/wp/wp-json/cabinet/v1/admin/chat/messages?clientId=15" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Ожидается:** `200 OK` с данными или `403 Forbidden` если нет прав

---

### Тест 8: Telegram Webhook (имитация)

```bash
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": 123,
      "chat": {"id": 456},
      "text": "Ответ менеджера [CID:15]",
      "reply_to_message": {
        "message_id": 122,
        "text": "Сообщение клиента"
      }
    }
  }'
```

**Ожидаемый ответ:**
```json
{
  "ok": true
}
```

**Проверьте логи:**
- В `wp-content/debug.log` должно появиться:
  ```
  [Telegram Webhook] Received request
  [Telegram Webhook] Message saved: ...
  ```

---

### Тест 9: Проверка админ-страницы в WordPress

1. Войдите в WordPress Admin
2. В меню слева найдите **"BazarBuy Чат"**
3. Нажмите на пункт меню
4. Должна открыться страница с интерфейсом чата
5. Проверьте консоль браузера (F12) — не должно быть ошибок

---

### Тест 10: Rate limiting

Отправьте **11 сообщений подряд** в течение минуты:

```bash
for i in {1..11}; do
  curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/send \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"Сообщение $i\"}"
  echo ""
  sleep 1
done
```

**Ожидается:**
- Первые 10 сообщений: `200 OK`
- 11-е сообщение: `429 Too Many Requests`

---

## ✅ ЧЕКЛИСТ УСТАНОВКИ

### Подготовка:
- [ ] Все файлы скопированы в правильные папки
- [ ] Структура папок создана (`includes/api/`, `includes/db/`, `admin-ui/`, `migrations/`)
- [ ] Права доступа к файлам установлены (644 для файлов, 755 для папок)

### Конфигурация:
- [ ] Все контроллеры подключены через `require_once`
- [ ] Все endpoints зарегистрированы в `rest_api_init`
- [ ] Страница админ-чата создана в `admin_menu`
- [ ] `wp-config.php` настроен (JWT_SECRET, режимы работы)

### База данных:
- [ ] SQL миграция выполнена (если используете БД)
- [ ] Таблица `wp_bazarbuy_chat_messages` создана
- [ ] Индексы созданы корректно

### Telegram:
- [ ] Bot создан через @BotFather
- [ ] Bot Token сохранён в `wp-config.php`
- [ ] Chat ID получен и сохранён
- [ ] Webhook установлен через Bot API
- [ ] Webhook проверен через `getWebhookInfo`

### Тестирование:
- [ ] Синтаксис PHP проверен (нет ошибок)
- [ ] Endpoints доступны (401 без токена)
- [ ] JWT токен получается успешно
- [ ] Профиль пользователя загружается
- [ ] Сообщения отправляются (mock режим работает)
- [ ] История чата получается
- [ ] Админ-чат endpoints работают
- [ ] Telegram webhook обрабатывает запросы
- [ ] Админ-страница в WordPress открывается
- [ ] Rate limiting работает (10 сообщений/минуту)

---

## 🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ

После выполнения всех шагов у вас будет:

✅ **Полнофункциональный WordPress плагин** для чата и коммуникаций

✅ **Для клиентов:**
- Личный кабинет с профилем
- Встроенный чат с менеджерами
- История сообщений
- Уведомления о статусах

✅ **Для менеджеров:**
- Админ-интерфейс в WordPress
- Список всех диалогов
- Статусы прочтения
- Уведомления в Telegram
- Ответы прямо из Telegram

✅ **Технические возможности:**
- Безопасность (JWT, rate limiting, XSS protection)
- Гибкость (mock и production режимы)
- Масштабируемость (модульная архитектура)
- Интеграция (WordPress + Telegram)

---

## 🚀 ПЕРЕХОД В PRODUCTION

Когда всё протестировано и работает:

1. **Переключить режимы в `wp-config.php`:**
   ```php
   define('BAZARBUY_CHAT_USE_DB', true);
   define('BAZARBUY_TELEGRAM_ENABLED', true);
   ```

2. **Выполнить SQL миграцию** (если ещё не выполнена)

3. **Настроить Telegram Bot и Webhook**

4. **Очистить кэш WordPress:**
   ```bash
   wp cache flush
   ```

5. **Перезагрузить PHP-FPM** (если используется)

---

**Система готова к production использованию! 🎉**



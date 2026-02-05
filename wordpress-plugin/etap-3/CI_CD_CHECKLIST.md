# 🚀 Production CI/CD Чеклист

**Версия:** 1.0.0  
**Цель:** Гарантировать качество и безопасность перед релизом в production

---

## 📋 REPOSITORY SETUP

### Git структура:
- [ ] **Branches:** `main` (production) и `develop` (development)
- [ ] **`.env.example`** создан с примерами всех переменных окружения
- [ ] **`.gitignore`** исключает:
  - `*.log`
  - `.env`
  - `node_modules/`
  - `vendor/`
  - `.DS_Store`
  - `*.cache`
- [ ] **Secrets не в коде:**
  - JWT secret в `.env`
  - Telegram tokens в `.env`
  - Database credentials в `wp-config.php` (не в git)

### Versioning:
- [ ] Используется **Semantic Versioning** (MAJOR.MINOR.PATCH)
- [ ] Версия в главном файле плагина
- [ ] Теги Git для релизов: `v3.0.0`, `v3.1.0` и т.д.

---

## 🔍 BACKEND: Статический анализ

### PHPStan (уровень 5+):

```bash
# Установка через Composer
composer require --dev phpstan/phpstan

# Запуск анализа
vendor/bin/phpstan analyse includes/ --level=5
```

**Ожидается:**
- ✅ Нет ошибок уровня 5+
- ✅ Все типы определены корректно
- ✅ Нет undefined методов/свойств

### PHPCS (WordPress Coding Standards):

```bash
# Установка
composer require --dev wp-coding-standards/wpcs

# Запуск проверки
vendor/bin/phpcs includes/ --standard=WordPress
```

**Ожидается:**
- ✅ Соответствие WordPress Coding Standards
- ✅ Отступы: табы (не пробелы)
- ✅ Именование классов: PascalCase
- ✅ Именование функций: snake_case

---

## 🧪 BACKEND: Тесты

### Unit тесты (PHPUnit):

**Создать:** `tests/Unit/Chat_DB_Test.php`

```php
<?php
class Chat_DB_Test extends WP_UnitTestCase {
    public function test_save_message() {
        $db = new Bazarbuy_Chat_DB();
        $id = $db->save_message(1, 'client', 'Test message');
        $this->assertNotEmpty($id);
    }
    
    public function test_get_messages() {
        $db = new Bazarbuy_Chat_DB();
        $messages = $db->get_messages(1, 10, 0);
        $this->assertIsArray($messages);
    }
}
```

**Запуск:**
```bash
vendor/bin/phpunit tests/Unit/
```

**Ожидается:** ✅ Все тесты проходят

---

### API Integration тесты:

**Тесты endpoints:**
- [ ] `/chat/send` — отправка сообщения
- [ ] `/chat/history` — получение истории
- [ ] `/telegram/webhook` — обработка webhook
- [ ] `/admin/chat/threads` — список диалогов

**Использовать:**
```bash
# WP-CLI для тестирования
wp eval-file tests/api-test.php
```

---

## 🔒 БЕЗОПАСНОСТЬ

### Проверка перед релизом:

- [ ] **JWT secret** в `.env` или `wp-config.php` (не в коде)
- [ ] **Telegram secret token** в `.env` (не в коде)
- [ ] **Rate limiting** включен и работает
- [ ] **SQL prepare** используется везде (нет прямых запросов)
- [ ] **CORS** ограничен только нужными доменами
- [ ] **XSS protection:** `wp_strip_all_tags()`, `sanitize_text_field()`
- [ ] **CSRF protection:** nonce для админских действий
- [ ] **Проверка прав доступа** на всех endpoints

### Сканирование безопасности:

```bash
# Использовать wp-cli для проверки
wp security scan

# Или сторонние инструменты
phpstan analyse --level=max includes/
```

---

## 🎨 FRONTEND

### Production build:

- [ ] **Mock режим отключён:**
  ```javascript
  CONFIG.useMock = false;  // В production
  ```

- [ ] **Minify JavaScript:**
  ```bash
  npm run build:prod
  # или
  terser admin-ui/admin-chat.js -o admin-ui/admin-chat.min.js
  ```

- [ ] **Minify CSS** (если есть отдельные стили)

- [ ] **Source maps** отключены в production

### Error tracking:

- [ ] **Sentry** или аналог настроен:
  ```javascript
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN',
    environment: 'production'
  });
  ```

- [ ] Ошибки логируются и отслеживаются

---

## 📦 DEPLOYMENT

### Перед релизом:

- [ ] **Backup БД:**
  ```bash
  wp db export backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Backup плагина:**
  ```bash
  tar -czf bazarbuy-cabinet_backup_$(date +%Y%m%d).tar.gz wp-content/plugins/bazarbuy-cabinet/
  ```

- [ ] **Maintenance mode** (если нужно):
  ```php
  // В wp-config.php временно:
  define('WP_MAINTENANCE_MODE', true);
  ```

- [ ] **SQL migrations** применены:
  ```bash
  wp db query < migrations/001_create_chat_tables.sql
  wp db query < migrations/002_create_chat_threads_reads.sql
  ```

- [ ] **Версия обновлена** в главном файле плагина

---

### После релиза:

- [ ] **Health check endpoints:**
  ```bash
  curl https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/me
  # Должен вернуть 401 (не 500)
  ```

- [ ] **Тест входа:**
  ```bash
  curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password"}'
  ```

- [ ] **Тест отправки сообщения:**
  ```bash
  # Получить токен и отправить сообщение
  curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/send \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"Test"}'
  ```

- [ ] **Тест Telegram webhook:**
  ```bash
  curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/telegram/webhook \
    -H "Content-Type: application/json" \
    -d '{"message":{"text":"[CID:1] Test","chat":{"id":123}}}'
  ```

- [ ] **Мониторинг логов 24 часа:**
  - Проверить `wp-content/debug.log`
  - Проверить логи сервера (access.log, error.log)
  - Нет критических ошибок

---

## 📊 МОНИТОРИНГ

### Настройка мониторинга:

- [ ] **Error logging:**
  ```php
  // В wp-config.php:
  define('WP_DEBUG', false);      // false в production
  define('WP_DEBUG_LOG', true);   // true для логирования
  define('WP_DEBUG_DISPLAY', false); // false в production
  ```

- [ ] **Slow query log** (MySQL):
  ```sql
  SET GLOBAL slow_query_log = 'ON';
  SET GLOBAL long_query_time = 2;
  ```

- [ ] **Uptime Robot** или аналог:
  - Мониторинг главной страницы
  - Мониторинг API endpoints
  - Уведомления о падении

- [ ] **Telegram alerts:**
  - Критические ошибки → Telegram
  - Падение сервера → Telegram
  - Превышение rate limit → Telegram

---

## 📝 ПРОВЕРОЧНЫЙ СПИСОК ПЕРЕД РЕЛИЗОМ

### Код:
- [ ] Все файлы прошли PHPStan (уровень 5+)
- [ ] Все файлы прошли PHPCS (WordPress стандарты)
- [ ] Unit тесты проходят
- [ ] API тесты проходят
- [ ] Нет TODO / FIXME в коде

### Безопасность:
- [ ] Secrets не в коде
- [ ] Rate limiting работает
- [ ] SQL injection защита
- [ ] XSS protection
- [ ] CORS настроен корректно

### Конфигурация:
- [ ] `.env.example` обновлён
- [ ] Версия плагина обновлена
- [ ] Changelog создан
- [ ] README обновлён

### Deployment:
- [ ] Backup БД выполнен
- [ ] Backup плагина выполнен
- [ ] Миграции применены
- [ ] Health checks проходят

### Мониторинг:
- [ ] Логирование настроено
- [ ] Error tracking настроен
- [ ] Uptime monitoring настроен
- [ ] Telegram alerts настроены

---

## 🎯 КРИТЕРИИ УСПЕШНОГО РЕЛИЗА

После выполнения всех пунктов:

✅ **Код соответствует стандартам** (PHPStan, PHPCS)  
✅ **Все тесты проходят** (unit, integration)  
✅ **Безопасность проверена** (нет уязвимостей)  
✅ **Мониторинг настроен** (логи, alerts)  
✅ **Health checks проходят** (API доступен)  
✅ **Backup создан** (БД и файлы)  

**Готово к production! 🚀**



# ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ ТЕСТИРОВАНИЯ

**Версия:** 3.0.0  
**Дата:** 2026-01-XX

---

## 📋 ПРЕДВАРИТЕЛЬНЫЕ ПРОВЕРКИ

### Системные требования:
- [ ] WordPress 5.0 или выше
- [ ] PHP 7.4 или выше
- [ ] MySQL 5.7 или выше (если используете БД)
- [ ] Права на запись в папку плагина
- [ ] Права на создание таблиц БД (если используете)

### Установка файлов:
- [ ] Все контроллеры скопированы в `includes/api/`
- [ ] `class-chat-db.php` скопирован в `includes/db/`
- [ ] `admin-chat.js` скопирован в `admin-ui/`
- [ ] Главный файл плагина обновлён
- [ ] Структура папок корректна

### Конфигурация:
- [ ] `wp-config.php` содержит `BAZARBUY_JWT_SECRET`
- [ ] Режимы работы настроены (mock/production)
- [ ] Telegram настройки добавлены (если используется)

---

## 🧪 ТЕСТИРОВАНИЕ ENDPOINTS

### Тест 1: Проверка синтаксиса PHP

```bash
php -l includes/api/class-auth-controller.php
php -l includes/api/class-user-controller.php
php -l includes/api/class-chat-controller.php
php -l includes/api/class-telegram-controller.php
php -l includes/api/class-admin-chat-controller.php
php -l includes/api/class-telegram-webhook-controller.php
php -l includes/db/class-chat-db.php
```

**Ожидается:** ✅ `No syntax errors detected` для всех файлов

---

### Тест 2: Доступность endpoints (без авторизации)

```bash
# Проверка API root
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/

# Проверка авторизации (401)
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/me

# Проверка профиля (401)
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client

# Проверка чата (401)
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/history

# Проверка админ-чата (401)
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/admin/chat/threads
```

**Ожидается:** ✅ `401 Unauthorized` для всех запросов

---

### Тест 3: Получение JWT токена

```bash
# Регистрация нового пользователя
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "name": "Test User"
  }'

# Или вход
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

**Ожидается:** ✅ `200 OK` с токеном в ответе

**Сохраните токен:**
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

**Ожидается:**
- ✅ `200 OK`
- ✅ Объект с полями: `id`, `clientId`, `email`, `name`
- ✅ `clientId` сгенерирован автоматически

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

**Ожидается:**
- ✅ `200 OK`
- ✅ Объект с полями: `id`, `status: "pending"`
- ✅ В логах: `[Bazarbuy_Chat_DB Mock] Сохранено сообщение`

**Повторите 3 раза** для проверки сохранения нескольких сообщений.

---

### Тест 6: Получение истории чата

```bash
curl -X GET "https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/history?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Ожидается:**
- ✅ `200 OK`
- ✅ Массив сообщений
- ✅ Сообщения отсортированы по дате (новые первыми)
- ✅ Формат: `id`, `from`, `text`, `status`, `createdAt`, `orderId`

---

### Тест 7: Валидация сообщений

```bash
# Пустое сообщение
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'
```

**Ожидается:** ✅ `400 Bad Request` с сообщением об ошибке

```bash
# Слишком длинное сообщение (>2000 символов)
LONG_MESSAGE=$(python3 -c "print('A' * 2001)")
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"$LONG_MESSAGE\"}"
```

**Ожидается:** ✅ `400 Bad Request` с сообщением о превышении длины

---

### Тест 8: Rate limiting

```bash
# Отправить 11 сообщений подряд
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
- ✅ Первые 10 сообщений: `200 OK`
- ✅ 11-е сообщение: `429 Too Many Requests`

---

### Тест 9: Telegram уведомления (mock режим)

```bash
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/telegram/notify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new_message",
    "clientId": "BB-00001",
    "clientName": "Test User",
    "text": "Тестовое сообщение"
  }'
```

**Ожидается:**
- ✅ `200 OK`
- ✅ В логах: `[Bazarbuy_Telegram Mock] Уведомление: ...`

---

### Тест 10: Админ-чат endpoints (требует админских прав)

**Получите админский токен:**
```bash
# Войдите как администратор WordPress
ADMIN_TOKEN="админский_jwt_токен"
```

**Список диалогов:**
```bash
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/admin/chat/threads \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Ожидается:**
- ✅ `200 OK`
- ✅ Массив диалогов с полями: `clientId`, `clientName`, `lastMessage`, `unreadCount`

**Сообщения клиента:**
```bash
curl -X GET "https://ваш-домен.com/wp/wp-json/cabinet/v1/admin/chat/messages?clientId=BB-00001" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Ожидается:**
- ✅ `200 OK`
- ✅ Массив сообщений диалога

**Отправка сообщения от менеджера:**
```bash
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/admin/chat/send \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "BB-00001",
    "message": "Ответ менеджера"
  }'
```

**Ожидается:**
- ✅ `200 OK`
- ✅ Объект с `id` и `status: "delivered"`

---

### Тест 11: Telegram Webhook

```bash
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": 123,
      "chat": {"id": 456},
      "text": "Ответ менеджера [CID:1]",
      "reply_to_message": {
        "message_id": 122,
        "text": "Сообщение клиента"
      }
    }
  }'
```

**Ожидается:**
- ✅ `200 OK`
- ✅ В логах: `[Telegram Webhook] Received request`
- ✅ В логах: `[Telegram Webhook] Message saved`

---

### Тест 12: Админ-страница в WordPress

1. [ ] Войдите в WordPress Admin
2. [ ] Найдите пункт меню "BazarBuy Чат"
3. [ ] Нажмите на пункт меню
4. [ ] Страница открывается без ошибок
5. [ ] Интерфейс чата отображается
6. [ ] Консоль браузера (F12) не показывает ошибок
7. [ ] Список диалогов загружается
8. [ ] Можно открыть диалог с клиентом
9. [ ] Можно отправить сообщение

---

## 🔒 ТЕСТИРОВАНИЕ БЕЗОПАСНОСТИ

### Тест 13: Проверка JWT токена

```bash
# Запрос с невалидным токеном
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/user/client \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json"
```

**Ожидается:** ✅ `401 Unauthorized`

---

### Тест 14: Проверка прав доступа

```bash
# Попытка доступа к админ-чату с обычным токеном клиента
curl -X GET https://ваш-домен.com/wp/wp-json/cabinet/v1/admin/chat/threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Ожидается:** ✅ `403 Forbidden`

---

### Тест 15: XSS защита

```bash
# Попытка отправить HTML/JavaScript в сообщении
curl -X POST https://ваш-домен.com/wp/wp-json/cabinet/v1/chat/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<script>alert(\"XSS\")</script>Test"
  }'
```

**Ожидается:**
- ✅ `200 OK`
- ✅ HTML теги удалены из сообщения
- ✅ Сохранён только текст: `Test`

---

## 📊 ТЕСТИРОВАНИЕ PRODUCTION РЕЖИМА

### Тест 16: Переключение на БД

1. [ ] Установить `BAZARBUY_CHAT_USE_DB = true` в `wp-config.php`
2. [ ] Выполнить SQL миграцию
3. [ ] Отправить сообщение
4. [ ] Проверить в БД: `SELECT * FROM wp_bazarbuy_chat_messages`
5. [ ] Сообщение сохранено в таблице

---

### Тест 17: Telegram в production режиме

1. [ ] Создать Telegram Bot
2. [ ] Получить Bot Token и Chat ID
3. [ ] Установить в `wp-config.php`
4. [ ] Установить `BAZARBUY_TELEGRAM_ENABLED = true`
5. [ ] Отправить сообщение в чат
6. [ ] Проверить получение уведомления в Telegram

---

### Тест 18: Telegram Webhook в production

1. [ ] Установить webhook через Bot API
2. [ ] Отправить сообщение боту в Telegram с форматом `[CID:1]`
3. [ ] Проверить сохранение ответа в БД
4. [ ] Проверить отображение в админ-чате

---

## ✅ ИТОГОВЫЙ ЧЕКЛИСТ

### Основные функции:
- [x] Синтаксис PHP проверен
- [ ] Endpoints доступны (401 без токена)
- [ ] JWT токен получается
- [ ] Профиль пользователя работает
- [ ] Отправка сообщений работает
- [ ] Получение истории работает
- [ ] Валидация сообщений работает
- [ ] Rate limiting работает

### Расширенные функции:
- [ ] Админ-чат endpoints работают
- [ ] Telegram уведомления логируются (mock)
- [ ] Telegram webhook обрабатывает запросы
- [ ] Админ-страница в WordPress работает

### Безопасность:
- [ ] JWT проверка работает
- [ ] Права доступа проверяются
- [ ] XSS защита работает

### Production:
- [ ] Переключение на БД работает
- [ ] Telegram в production работает
- [ ] Webhook в production работает

---

**После прохождения всех тестов система готова к production! 🚀**



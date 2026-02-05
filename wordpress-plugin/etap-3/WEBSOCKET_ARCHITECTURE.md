# 🔌 Архитектура WebSocket слоя для реального времени

**Цель:** Реализовать real-time обновления чата без постоянного polling

---

## 🏗️ АРХИТЕКТУРА (Вариант A — рекомендуемый)

```
┌─────────────┐
│ Client UI   │
│ (Frontend)  │
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────────────┐
│  Node.js Gateway    │
│  (WS / Socket.io)   │
│                     │
│  ┌──────────────┐   │
│  │ JWT Auth     │   │
│  │ Redis PubSub │   │
│  │ Broadcasting │   │
│  └──────────────┘   │
└──────┬──────────────┘
       │ Redis PubSub
       ▼
┌─────────────────────┐
│  WordPress REST API │
│  (Chat Controller)  │
│                     │
│  Save to DB         │
│  → Emit to Redis    │
└─────────────────────┘
       │
       ▼
┌─────────────┐
│ Admin UI    │
│ (WP Admin)  │
└─────────────┘
```

---

## 📊 ПОТОК СООБЩЕНИЙ

### Клиент отправляет сообщение:

1. **Client UI** → `POST /chat/send` (REST API)
2. **Chat Controller** сохраняет в БД
3. **Chat Controller** публикует событие в Redis:
   ```php
   $redis->publish('chat.thread.15', json_encode([
       'type' => 'new_message',
       'threadId' => 15,
       'message' => {...}
   ]));
   ```
4. **Node.js Gateway** подписан на Redis канал
5. **Gateway** получает событие и транслирует через WebSocket
6. **Admin UI** получает обновление в реальном времени

---

## 🛠️ СТЕК ТЕХНОЛОГИЙ

### Node.js Gateway:

- **WebSocket библиотека:** `ws` или `socket.io`
- **Redis клиент:** `ioredis` или `redis`
- **JWT проверка:** `jsonwebtoken`
- **HTTP клиент:** `axios` (для запросов к WordPress API)

### Зависимости:

```json
{
  "dependencies": {
    "ws": "^8.0.0",
    "ioredis": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "axios": "^1.0.0"
  }
}
```

---

## 🔐 ОТВЕТСТВЕННОСТИ GATEWAY

### 1. Аутентификация через JWT:

```javascript
// При подключении WebSocket
socket.on('connection', (ws, req) => {
    const token = req.url.split('token=')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        ws.userId = decoded.userId;
        ws.userRole = decoded.role;
    } catch (err) {
        ws.close(1008, 'Invalid token');
        return;
    }
});
```

### 2. Подписка на каналы:

```javascript
// Клиент подписывается на свой диалог
socket.on('subscribe', (threadId) => {
    const channel = `chat.thread.${threadId}`;
    redis.subscribe(channel);
    
    redis.on('message', (channel, message) => {
        socket.send(message); // Трансляция клиенту
    });
});
```

### 3. Трансляция сообщений:

```javascript
// При получении события из Redis
redis.on('message', (channel, message) => {
    const data = JSON.parse(message);
    
    // Отправляем всем подписанным на этот канал
    connectedClients.forEach(client => {
        if (client.subscribedChannels.includes(channel)) {
            client.send(message);
        }
    });
});
```

### 4. Typing events:

```javascript
// Клиент отправляет typing indicator
socket.on('typing', (threadId, isTyping) => {
    redis.publish(`chat.thread.${threadId}.typing`, JSON.stringify({
        userId: socket.userId,
        isTyping: isTyping
    }));
});
```

### 5. Read receipts:

```javascript
// Клиент отметил как прочитанное
socket.on('read', (messageIds) => {
    redis.publish(`chat.user.${socket.userId}.read`, JSON.stringify({
        messageIds: messageIds
    }));
});
```

---

## 📡 КАНАЛЫ REDIS

### Структура каналов:

```
chat.thread.{threadId}          # Сообщения в диалоге
chat.client.{clientId}          # События для конкретного клиента
chat.manager.{managerId}        # События для конкретного менеджера
chat.thread.{threadId}.typing   # Typing indicators
chat.user.{userId}.read         # Read receipts
```

### Примеры:

- `chat.thread.15` — все сообщения в диалоге #15
- `chat.client.1` — события для клиента с ID=1
- `chat.manager.5` — события для менеджера с ID=5

---

## 💬 МИНИМАЛЬНЫЙ ПРОТОКОЛ

### Формат сообщения:

```json
{
  "type": "message" | "typing" | "read" | "thread_update",
  "threadId": 15,
  "payload": {
    "id": "msg_123",
    "from": "client",
    "text": "Сообщение",
    "createdAt": "2025-01-10T12:00:00Z"
  }
}
```

### Типы сообщений:

- `message` — новое сообщение
- `typing` — пользователь печатает
- `read` — сообщения прочитаны
- `thread_update` — обновление диалога (статус, менеджер)

---

## 🔄 FALLBACK ВАРИАНТ (Вариант B)

Если нет возможности использовать Node.js + Redis:

### Long Polling (уже реализован):

```javascript
// В admin-chat.js уже есть polling каждые 3 секунды
setInterval(() => {
    if (activeClientId) {
        loadMessages();
    }
}, 3000);
```

**Преимущества:**
- ✅ Не требует дополнительной инфраструктуры
- ✅ Работает везде
- ✅ Уже реализовано

**Недостатки:**
- ❌ Задержка до 3 секунд
- ❌ Больше нагрузка на сервер
- ❌ Не идеально для real-time

---

## 🚀 РЕАЛИЗАЦИЯ GATEWAY (Пример)

### Структура проекта:

```
websocket-gateway/
├── server.js
├── config.js
├── auth.js
├── redis-client.js
└── package.json
```

### `server.js` (основной файл):

```javascript
const WebSocket = require('ws');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const config = require('./config');

const wss = new WebSocket.Server({ port: 8080 });
const redis = new Redis(config.redis);

const connectedClients = new Map();

wss.on('connection', (ws, req) => {
    // Аутентификация через JWT
    const token = extractToken(req);
    const user = verifyJWT(token);
    
    if (!user) {
        ws.close(1008, 'Unauthorized');
        return;
    }
    
    ws.userId = user.userId;
    ws.userRole = user.role;
    ws.subscribedChannels = [];
    
    connectedClients.set(ws.userId, ws);
    
    // Подписка на каналы пользователя
    subscribeToUserChannels(ws);
    
    // Обработка сообщений от клиента
    ws.on('message', (message) => {
        handleClientMessage(ws, JSON.parse(message));
    });
    
    ws.on('close', () => {
        connectedClients.delete(ws.userId);
        unsubscribeFromChannels(ws);
    });
});

// Подписка на Redis каналы
redis.on('message', (channel, message) => {
    broadcastToSubscribers(channel, message);
});

function broadcastToSubscribers(channel, message) {
    connectedClients.forEach((client) => {
        if (client.subscribedChannels.includes(channel)) {
            client.send(message);
        }
    });
}
```

---

## 🔧 ИНТЕГРАЦИЯ С WORDPRESS

### Изменения в Chat Controller:

```php
// После сохранения сообщения
$message_id = $this->db->save_message(...);

// Публикация в Redis (если доступен)
if (function_exists('redis_publish')) {
    redis_publish('chat.thread.' . $thread_id, json_encode([
        'type' => 'new_message',
        'threadId' => $thread_id,
        'payload' => [
            'id' => $message_id,
            'from' => 'client',
            'text' => $message_text,
            'createdAt' => date('c')
        ]
    ]));
}
```

### Redis подключение в WordPress:

```php
// Использовать Redis Object Cache plugin
// или
function bazarbuy_redis_publish($channel, $message) {
    $redis = new Redis();
    $redis->connect('127.0.0.1', 6379);
    $redis->publish($channel, $message);
    $redis->close();
}
```

---

## ✅ ПРЕИМУЩЕСТВА WEBSOCKET

### Real-time:
- ✅ Мгновенные обновления (без задержки)
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Статусы "онлайн/офлайн"

### Масштабируемость:
- ✅ Меньше нагрузка на WordPress
- ✅ Горизонтальное масштабирование Gateway
- ✅ Redis для распределения нагрузки

### UX:
- ✅ Лучший пользовательский опыт
- ✅ Индикаторы активности
- ✅ Мгновенная доставка сообщений

---

## ⚠️ НЕДОСТАТКИ

- ❌ Требует дополнительную инфраструктуру (Node.js, Redis)
- ❌ Более сложная архитектура
- ❌ Дополнительные точки отказа

---

## 🎯 РЕКОМЕНДАЦИЯ

**Для MVP/начального этапа:** Использовать Long Polling (уже реализовано)

**Для production/масштабирования:** Перейти на WebSocket + Redis

**Переход можно сделать постепенно:**
1. Запустить Node.js Gateway параллельно
2. Опционально подключать WebSocket для тех, у кого поддерживается
3. Fallback на Long Polling для остальных

---

## 📝 ИТОГ

**У вас уже есть:**
- ✅ Long Polling (работает везде)
- ✅ Архитектура готова к расширению
- ✅ План миграции на WebSocket

**Для production можно:**
- Оставить Long Polling (работает стабильно)
- Или добавить WebSocket Gateway (лучший UX)



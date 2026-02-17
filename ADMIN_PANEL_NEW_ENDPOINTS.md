# ✅ Admin Panel - 12 New Endpoints Documentation

**Status**: 🟢 COMPLETE (47% → 100%)
**Date**: 2026-02-15
**Total Endpoints**: 23 (was 11, now 23)

---

## 📋 All 23 Endpoints Status

### ✅ Existing Endpoints (11)
1. ✅ `POST /api/v1/admin/login` - Admin login
2. ✅ `POST /api/v1/admin/logout` - Admin logout
3. ✅ `GET /api/v1/admin/products` - List products
4. ✅ `POST /api/v1/admin/products` - Create product
5. ✅ `PUT /api/v1/admin/products/:id` - Update product
6. ✅ `DELETE /api/v1/admin/products/:id` - Delete product
7. ✅ `GET /api/v1/admin/orders` - List orders
8. ✅ `PUT /api/v1/admin/orders/:id` - Update order
9. ✅ `GET /api/v1/admin/clients` - List clients
10. ✅ `GET /api/v1/admin/dashboard` - Dashboard metrics
11. ✅ `POST /api/v1/admin/products/upload` - Upload images

### ✨ NEW Endpoints (12)
1. ✨ `GET /api/v1/admin/products/:id` - Get single product
2. ✨ `POST /api/v1/admin/products/import` - Import products from JSON
3. ✨ `GET /api/v1/admin/orders/:id` - Get order details
4. ✨ `GET /api/v1/admin/orders/stats` - Get order statistics
5. ✨ `GET /api/v1/admin/clients/:id` - Get client profile
6. ✨ `PUT /api/v1/admin/clients/:id` - Update client profile
7. ✨ `PUT /api/v1/admin/clients/:id/block` - Block/unblock client
8. ✨ `GET /api/v1/admin/clients/:id/orders` - Get client's orders
9. ✨ `GET /api/v1/admin/chats` - List all chats
10. ✨ `GET /api/v1/admin/chats/:id/messages` - Get chat messages
11. ✨ `POST /api/v1/admin/chats/:id/messages` - Send chat message
12. ✨ `POST /api/v1/admin/refresh-token` - Refresh JWT token

---

## 🔍 New Endpoints Details

### 1. GET `/api/v1/admin/products/:id`
**Purpose**: Get single product details with images

**Request**:
```
GET /api/v1/admin/products/fabric-001
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "fabric-001",
    "name": "Хлопковая ткань белая",
    "sku": "HLB-001",
    "category": "Ткани",
    "price": 150,
    "stock": 100,
    "supplier": "Производитель №1",
    "colors": ["белый"],
    "rollLength": 25,
    "isActive": true,
    "image": "/images/fabric-1.jpg",
    "images": [
      {
        "id": "img-123",
        "url": "/uploads/fabric-001-123-abc.jpg",
        "name": "main.jpg",
        "isMain": true
      }
    ]
  }
}
```

**Error** (404 Not Found):
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 2. POST `/api/v1/admin/products/import`
**Purpose**: Bulk import products from JSON

**Request**:
```
POST /api/v1/admin/products/import
Authorization: Bearer {token}
Content-Type: application/json

{
  "products": [
    {
      "name": "Новая ткань",
      "sku": "NEW-001",
      "category": "Ткани",
      "price": 250,
      "stock": 50,
      "supplier": "Новый производитель",
      "colors": ["красный", "синий"],
      "rollLength": 30,
      "isActive": true
    },
    {
      "name": "Еще ткань",
      "sku": "NEW-002",
      "category": "Ткани",
      "price": 180,
      "stock": 75
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Imported 2 products with 0 errors",
  "data": {
    "imported": 2,
    "failed": 0,
    "products": [
      {
        "id": "fabric-1708000000-0",
        "name": "Новая ткань",
        "sku": "NEW-001",
        ...
      }
    ],
    "errors": []
  }
}
```

**Response with errors** (200):
```json
{
  "success": false,
  "message": "Imported 1 products with 1 errors",
  "data": {
    "imported": 1,
    "failed": 1,
    "products": [...],
    "errors": [
      {
        "index": 1,
        "error": "Missing required fields: name, sku, category, price"
      }
    ]
  }
}
```

---

### 3. GET `/api/v1/admin/orders/:id`
**Purpose**: Get detailed order information

**Request**:
```
GET /api/v1/admin/orders/order-001
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "order-001",
    "orderNumber": "#ORD-2024-001",
    "clientEmail": "client1@example.com",
    "clientName": "Иван Петров",
    "clientPhone": "+7-999-123-4567",
    "totalPrice": 4500,
    "status": "pending",
    "items": [
      {
        "productId": "fabric-001",
        "quantity": 10,
        "price": 150
      }
    ],
    "createdAt": "2024-02-12T15:30:00Z",
    "updatedAt": "2024-02-12T15:30:00Z"
  }
}
```

---

### 4. GET `/api/v1/admin/orders/stats`
**Purpose**: Get order statistics and metrics

**Request**:
```
GET /api/v1/admin/orders/stats
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total": 3,
    "todayCount": 0,
    "thisMonthCount": 2,
    "thisYearCount": 3,
    "totalRevenue": 14500,
    "todayRevenue": 0,
    "thisMonthRevenue": 3500,
    "byStatus": {
      "pending": 1,
      "processing": 0,
      "shipped": 1,
      "delivered": 1,
      "cancelled": 0
    },
    "averageOrderValue": 4833
  }
}
```

---

### 5. GET `/api/v1/admin/clients/:id`
**Purpose**: Get client profile information

**Request**:
```
GET /api/v1/admin/clients/client-001
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "client-001",
    "name": "Иван Петров",
    "email": "client1@example.com",
    "phone": "+7-999-123-4567",
    "company": "ООО Текстиль",
    "city": "Москва",
    "totalOrders": 5,
    "totalSpent": 25000,
    "status": "active",
    "joinedAt": "2024-11-16T10:30:00Z"
  }
}
```

---

### 6. PUT `/api/v1/admin/clients/:id`
**Purpose**: Update client profile information

**Request**:
```
PUT /api/v1/admin/clients/client-001
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Иван Новый",
  "company": "ООО Новая Фабрика",
  "phone": "+7-999-999-9999"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Client updated successfully",
  "data": {
    "id": "client-001",
    "name": "Иван Новый",
    "email": "client1@example.com",
    "phone": "+7-999-999-9999",
    "company": "ООО Новая Фабрика",
    "city": "Москва",
    "totalOrders": 5,
    "totalSpent": 25000,
    "status": "active",
    "joinedAt": "2024-11-16T10:30:00Z"
  }
}
```

---

### 7. PUT `/api/v1/admin/clients/:id/block`
**Purpose**: Block or unblock client account

**Request**:
```
PUT /api/v1/admin/clients/client-001/block
Authorization: Bearer {token}
Content-Type: application/json

{
  "block": true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Client blocked successfully",
  "data": {
    "id": "client-001",
    "name": "Иван Петров",
    "email": "client1@example.com",
    "status": "blocked",
    ...
  }
}
```

**To unblock**:
```json
{
  "block": false
}
```

---

### 8. GET `/api/v1/admin/clients/:id/orders`
**Purpose**: Get all orders from specific client

**Request**:
```
GET /api/v1/admin/clients/client-001/orders
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "order-001",
      "orderNumber": "#ORD-2024-001",
      "clientEmail": "client1@example.com",
      "clientName": "Иван Петров",
      "totalPrice": 4500,
      "status": "pending",
      "items": [...],
      "createdAt": "2024-02-12T15:30:00Z"
    },
    {
      "id": "order-002",
      ...
    }
  ],
  "total": 2
}
```

---

### 9. GET `/api/v1/admin/chats`
**Purpose**: List all active chats

**Request**:
```
GET /api/v1/admin/chats?search=Иван
Authorization: Bearer {token}
```

**Query Parameters**:
- `search` (optional): Search in client names

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "chat-001",
      "clientId": "client-001",
      "clientName": "Иван Петров",
      "lastMessage": "Спасибо за ответ!",
      "lastMessageTime": "2024-02-15T18:15:00Z",
      "unreadCount": 0,
      "createdAt": "2024-01-16T10:30:00Z"
    },
    {
      "id": "chat-002",
      "clientId": "client-002",
      "clientName": "Мария Сидорова",
      "lastMessage": "Когда будет доставка?",
      "lastMessageTime": "2024-02-15T18:13:00Z",
      "unreadCount": 2,
      "createdAt": "2024-01-26T10:30:00Z"
    }
  ],
  "total": 2
}
```

---

### 10. GET `/api/v1/admin/chats/:id/messages`
**Purpose**: Get chat message history

**Request**:
```
GET /api/v1/admin/chats/chat-001/messages?limit=50&offset=0
Authorization: Bearer {token}
```

**Query Parameters**:
- `limit` (optional, default: 50): Number of messages to return
- `offset` (optional, default: 0): Offset for pagination

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-001",
      "chatId": "chat-001",
      "sender": "client",
      "senderName": "Иван Петров",
      "message": "Здравствуйте, интересует хлопковая ткань",
      "timestamp": "2024-01-16T10:30:00Z"
    },
    {
      "id": "msg-002",
      "chatId": "chat-001",
      "sender": "admin",
      "senderName": "Admin",
      "message": "Здравствуйте! Какой размер вам нужен?",
      "timestamp": "2024-01-17T10:30:00Z"
    }
  ],
  "total": 4,
  "limit": 50,
  "offset": 0
}
```

---

### 11. POST `/api/v1/admin/chats/:id/messages`
**Purpose**: Send message in chat

**Request**:
```
POST /api/v1/admin/chats/chat-001/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Спасибо за покупку! Ваш заказ готов к отправке."
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "msg-123",
    "chatId": "chat-001",
    "sender": "admin",
    "senderName": "Admin",
    "message": "Спасибо за покупку! Ваш заказ готов к отправке.",
    "timestamp": "2024-02-15T18:15:45Z"
  }
}
```

---

### 12. POST `/api/v1/admin/refresh-token`
**Purpose**: Refresh expired JWT token

**Request**:
```
POST /api/v1/admin/refresh-token
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🔗 WebSocket Chat

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/chat/chat-001');

ws.onopen = () => {
  console.log('Connected to chat');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Message:', message);
};
```

### Send Message
```javascript
ws.send(JSON.stringify({
  sender: 'admin',
  senderName: 'Admin',
  message: 'Hello from admin!'
}));
```

### Message Format
```json
{
  "type": "message",
  "id": "msg-1708000000000",
  "chatId": "chat-001",
  "sender": "admin",
  "senderName": "Admin",
  "message": "Hello",
  "timestamp": "2024-02-15T18:15:45Z"
}
```

---

## 📊 Demo Data Included

The system comes with comprehensive demo data:

### Products (5+)
- Хлопковая ткань белая
- Льняная ткань синяя
- Шелковая ткань красная

### Clients (5+)
- Иван Петров (active)
- Мария Сидорова (active)
- Петр Иванов (active)
- Алиса Кузнецова (active)
- Дмитрий Волков (blocked)

### Orders (10+)
- Multiple orders with different statuses
- Complete order history per client

### Chats (3+)
- Active chats with message history
- Real-time message support via WebSocket

---

## 🔐 Authentication

All endpoints (except `/login`) require JWT token in header:

```
Authorization: Bearer {token}
```

**Login to get token**:
```bash
curl -X POST http://localhost:3000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fabrics.local",
    "password": "admin123"
  }'
```

---

## ✅ Validation Rules

### Product Import
- `name` (required): string
- `sku` (required): string, must be unique
- `category` (required): string
- `price` (required): number
- `stock` (optional): number
- `supplier` (optional): string
- `colors` (optional): array
- `rollLength` (optional): number

### Client Update
- All fields optional (partial update)
- Cannot update `status` field (use `/block` endpoint)

### Block Client
- `block` (required): boolean
- `true` = block, `false` = unblock

---

## 📈 Error Handling

All endpoints handle errors consistently:

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Product not found"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 🚀 Ready for Production

✅ All 23 endpoints implemented
✅ Real-time WebSocket chat
✅ Demo data included
✅ Error handling
✅ Input validation
✅ Pagination support
✅ Search & filtering
✅ JWT authentication
✅ Client blocking system

---

## 📞 Usage Example

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fabrics.local","password":"admin123"}' \
  | jq -r '.token')

# Get product
curl http://localhost:3000/api/v1/admin/products/fabric-001 \
  -H "Authorization: Bearer $TOKEN"

# Get order stats
curl http://localhost:3000/api/v1/admin/orders/stats \
  -H "Authorization: Bearer $TOKEN"

# Get chats
curl http://localhost:3000/api/v1/admin/chats \
  -H "Authorization: Bearer $TOKEN"
```

---

**Status**: ✅ COMPLETE & PRODUCTION READY
**Last Updated**: 2026-02-15

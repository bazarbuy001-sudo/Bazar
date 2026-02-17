# Backend API Contract for Admin Panel

## 📋 Overview

This document defines the complete API contract for the admin panel. All endpoints should return JSON with a consistent format.

## 🔐 Authentication

### 1. POST `/api/v1/admin/login`

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "status": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "admin-id",
      "public_id": "ADM-001",
      "email": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

**Error Response (401):**
```json
{
  "status": 401,
  "message": "Invalid credentials"
}
```

### 2. POST `/api/v1/admin/logout`

**Request:** Empty body + JWT token in header

**Response (200):**
```json
{
  "status": 200,
  "message": "Logout successful"
}
```

### 3. POST `/api/v1/admin/refresh-token`

**Request:** JWT token in header

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "token": "new-jwt-token"
  }
}
```

---

## 📊 Dashboard

### 4. GET `/api/v1/admin/dashboard`

**Query Parameters:** None

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "total_orders": 156,
    "total_revenue": 45678.50,
    "new_clients": 12,
    "average_order": 292.81,
    "order_status_pending": 5,
    "order_status_confirmed": 8,
    "order_status_processing": 3,
    "order_status_shipped": 20,
    "order_status_delivered": 120
  }
}
```

---

## 📦 Products

### 5. GET `/api/v1/admin/products`

**Query Parameters:**
- `limit`: number (default: 50)
- `offset`: number (default: 0)
- `category`: string (optional)
- `search`: string (optional)
- `sort`: string (optional, e.g., "-created_at")

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "products": [
      {
        "id": "product-id",
        "public_id": "PROD-001",
        "name": "Хлопковая ткань",
        "description": "Натуральная хлопковая ткань...",
        "price": 250.00,
        "old_price": 300.00,
        "category": "ткани",
        "colors": ["красный", "синий", "зеленый"],
        "image_url": "https://...",
        "created_at": "2026-01-15T10:00:00Z",
        "updated_at": "2026-01-20T14:30:00Z"
      }
    ],
    "total": 156,
    "limit": 50,
    "offset": 0
  }
}
```

### 6. GET `/api/v1/admin/products/:id`

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "id": "product-id",
    "public_id": "PROD-001",
    "name": "Хлопковая ткань",
    "description": "...",
    "price": 250.00,
    "old_price": 300.00,
    "category": "ткани",
    "colors": ["красный", "синий", "зеленый"],
    "image_url": "https://...",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-20T14:30:00Z"
  }
}
```

### 7. POST `/api/v1/admin/products`

**Request:**
```json
{
  "name": "Шелковая ткань",
  "description": "Премиум шелк...",
  "price": 500.00,
  "old_price": 600.00,
  "category": "ткани",
  "colors": ["черный", "белый"]
}
```

**Response (201):**
```json
{
  "status": 201,
  "data": {
    "id": "new-product-id",
    "public_id": "PROD-157",
    "name": "Шелковая ткань",
    ...
  },
  "message": "Product created successfully"
}
```

### 8. PUT `/api/v1/admin/products/:id`

**Request:** Same as POST

**Response (200):**
```json
{
  "status": 200,
  "data": { /* updated product */ },
  "message": "Product updated successfully"
}
```

### 9. DELETE `/api/v1/admin/products/:id`

**Response (200):**
```json
{
  "status": 200,
  "message": "Product deleted successfully"
}
```

### 10. POST `/api/v1/admin/products/import`

**Request:** Form-data with file + format
```
Content-Type: multipart/form-data
file: <file>
format: "json" | "csv"
```

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "imported_count": 45,
    "errors": []
  },
  "message": "Products imported successfully"
}
```

---

## 📋 Orders

### 11. GET `/api/v1/admin/orders`

**Query Parameters:**
- `limit`: number (default: 50)
- `offset`: number (default: 0)
- `status`: string (optional)
- `client_id`: UUID (optional)
- `search`: string (optional)
- `sort`: string (optional)

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "orders": [
      {
        "id": "order-id",
        "public_id": "ORD-2026-000156",
        "client_id": "client-id",
        "client_name": "ООО Рога и Копыта",
        "status": "pending",
        "total_amount": 5400.00,
        "currency": "RUB",
        "shipping_address": "г. Москва, ул. Ленина 1",
        "notes": "Срочно!",
        "created_at": "2026-02-01T10:00:00Z",
        "updated_at": "2026-02-01T10:00:00Z"
      }
    ],
    "total": 156,
    "limit": 50,
    "offset": 0
  }
}
```

### 12. GET `/api/v1/admin/orders/:id`

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "id": "order-id",
    "public_id": "ORD-2026-000156",
    "client_id": "client-id",
    "client_name": "ООО Рога и Копыта",
    "status": "pending",
    "total_amount": 5400.00,
    "currency": "RUB",
    "shipping_address": "г. Москва, ул. Ленина 1",
    "notes": "Срочно!",
    "items": [
      {
        "id": "item-id",
        "product_id": "product-id",
        "product_name": "Хлопковая ткань",
        "color": "красный",
        "requested_meters": 50.0,
        "fulfilled_meters": null,
        "unit_price_per_meter": 250.00,
        "total_price": 12500.00,
        "rolls": 3,
        "roll_allocations": null
      }
    ],
    "created_at": "2026-02-01T10:00:00Z",
    "updated_at": "2026-02-01T10:00:00Z"
  }
}
```

### 13. PUT `/api/v1/admin/orders/:id`

**Request:**
```json
{
  "status": "confirmed"
}
```

**Valid Statuses:**
- pending
- confirmed
- processing
- shipped
- delivered
- cancelled

**Response (200):**
```json
{
  "status": 200,
  "data": { /* updated order */ },
  "message": "Order status updated"
}
```

### 14. GET `/api/v1/admin/orders/stats`

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "total_orders": 156,
    "total_revenue": 45678.50,
    "average_order": 292.81,
    "pending_count": 5,
    "confirmed_count": 8,
    "processing_count": 3,
    "shipped_count": 20,
    "delivered_count": 120
  }
}
```

---

## 👥 Clients

### 15. GET `/api/v1/admin/clients`

**Query Parameters:**
- `limit`: number (default: 50)
- `offset`: number (default: 0)
- `search`: string (optional)
- `city`: string (optional)

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "clients": [
      {
        "id": "client-id",
        "public_id": "CL-0001",
        "name": "ООО Рога и Копыта",
        "email": "info@company.com",
        "phone": "+7 (999) 123-45-67",
        "city": "Москва",
        "inn": "7712345678",
        "is_active": true,
        "created_at": "2026-01-01T10:00:00Z"
      }
    ],
    "total": 45,
    "limit": 50,
    "offset": 0
  }
}
```

### 16. GET `/api/v1/admin/clients/:id`

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "id": "client-id",
    "public_id": "CL-0001",
    "name": "ООО Рога и Копыта",
    "email": "info@company.com",
    "phone": "+7 (999) 123-45-67",
    "city": "Москва",
    "inn": "7712345678",
    "is_active": true,
    "created_at": "2026-01-01T10:00:00Z",
    "updated_at": "2026-02-15T14:30:00Z"
  }
}
```

### 17. PUT `/api/v1/admin/clients/:id`

**Request:**
```json
{
  "phone": "+7 (999) 999-99-99",
  "city": "Санкт-Петербург"
}
```

**Response (200):**
```json
{
  "status": 200,
  "data": { /* updated client */ },
  "message": "Client updated"
}
```

### 18. PUT `/api/v1/admin/clients/:id/block`

**Request:**
```json
{
  "reason": "Задолженность"
}
```

**Response (200):**
```json
{
  "status": 200,
  "message": "Client blocked"
}
```

### 19. PUT `/api/v1/admin/clients/:id/unblock`

**Response (200):**
```json
{
  "status": 200,
  "message": "Client unblocked"
}
```

### 20. GET `/api/v1/admin/clients/:id/orders`

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "orders": [
      {
        "id": "order-id",
        "public_id": "ORD-2026-000156",
        "status": "delivered",
        "total_amount": 5400.00,
        "created_at": "2026-02-01T10:00:00Z"
      }
    ],
    "stats": {
      "total_orders": 12,
      "total_amount": 45600.00,
      "average_order": 3800.00
    }
  }
}
```

---

## 💬 Messages

### 21. GET `/api/v1/admin/chats`

**Query Parameters:**
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "chats": [
      {
        "id": "chat-id",
        "client_id": "client-id",
        "client_name": "ООО Рога и Копыта",
        "last_message": "Когда будет доставка?",
        "last_message_at": "2026-02-15T14:30:00Z",
        "unread_count": 2
      }
    ],
    "total": 8
  }
}
```

### 22. GET `/api/v1/admin/messages/:id`

**Query Parameters:**
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response (200):**
```json
{
  "status": 200,
  "data": {
    "messages": [
      {
        "id": "message-id",
        "chat_id": "chat-id",
        "sender_id": "admin-id",
        "sender_type": "admin",
        "sender_name": "John Doe",
        "text": "Привет! Чем я могу помочь?",
        "created_at": "2026-02-15T14:25:00Z"
      },
      {
        "id": "message-id-2",
        "chat_id": "chat-id",
        "sender_id": "client-id",
        "sender_type": "client",
        "sender_name": "ООО Рога и Копыта",
        "text": "Когда будет доставка?",
        "created_at": "2026-02-15T14:30:00Z"
      }
    ],
    "total": 24
  }
}
```

### 23. POST `/api/v1/admin/messages/:id`

**Request:**
```json
{
  "text": "Доставка планируется на завтра",
  "attachment_url": null
}
```

**Response (201):**
```json
{
  "status": 201,
  "data": {
    "id": "message-id",
    "chat_id": "chat-id",
    "sender_id": "admin-id",
    "sender_type": "admin",
    "text": "Доставка планируется на завтра",
    "created_at": "2026-02-15T14:35:00Z"
  },
  "message": "Message sent"
}
```

---

## 🔄 HTTP Headers

### Request Headers
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Response Headers
```
Content-Type: application/json
X-Total-Count: 156    (for paginated responses)
X-Page-Count: 4       (for paginated responses)
```

---

## ⚠️ Error Responses

### 401 Unauthorized
```json
{
  "status": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "status": 403,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "status": 404,
  "message": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "status": 422,
  "message": "Validation failed",
  "details": {
    "email": ["Invalid email format"],
    "price": ["Price must be positive"]
  }
}
```

### 500 Server Error
```json
{
  "status": 500,
  "message": "Internal server error"
}
```

---

## 📝 Notes for Backend Developers

1. **All timestamps** should be in ISO 8601 format (UTC)
2. **Pagination** - use `limit` and `offset` (not page numbers)
3. **Prices** - always return as decimals with 2 decimal places
4. **Validation** - validate on server side, not just client
5. **CORS** - allow requests from admin domain
6. **Rate limiting** - optional but recommended
7. **Logging** - log all admin actions for audit trail
8. **Authentication** - use JWT tokens with 1 hour expiration

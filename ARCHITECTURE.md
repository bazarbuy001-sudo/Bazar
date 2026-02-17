# ARCHITECTURE - Bazar Buy (Node.js + Express + React + TypeScript)

**Версия:** 1.0  
**Дата:** 2026-02-15  
**Статус:** CANONICAL  
**Источник:** ТЗ + DECISIONS.md

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                    │
│  http://localhost:5173                                      │
│  ├── Pages: Home, Catalog, Product, Cart, Checkout, Cabinet│
│  ├── Components: Header, Footer, ProductCard, etc.          │
│  ├── State: Zustand stores                                  │
│  └── API: Axios client → /api/v1/                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ CORS: http://localhost:3000
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                     BACKEND (Express)                       │
│  http://localhost:3000                                      │
│  ├── API Routes: /api/v1/{resource}                        │
│  ├── Controllers: Handle requests                           │
│  ├── Services: Business logic                               │
│  ├── Middleware: Auth, validation, error handling           │
│  ├── Database: Prisma ORM                                   │
│  └── Sagas: Orchestrate complex workflows                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   PostgreSQL Database                       │
│  (docker-compose: postgres:16-alpine)                       │
│  ├── clients (B2B)                                          │
│  ├── admin_users                                            │
│  ├── orders                                                 │
│  ├── order_items (meters model)                             │
│  ├── saga_orchestration + saga_steps                        │
│  ├── idempotent_requests                                    │
│  └── sessions                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema (CANONICAL)

### Core Entities

| Entity | Purpose | Owner |
|--------|---------|-------|
| **clients** | Юридические лица (компании) | B2B |
| **admin_users** | Администраторы системы | Internal |
| **orders** | Заказы | client_id |
| **order_items** | Позиции заказов (метраж) | order_id |
| **saga_orchestration** | Асинхронные саги | request-driven |
| **saga_steps** | Шаги саги (source of truth) | saga_id |
| **idempotent_requests** | Идемпотентность | client_id |
| **sessions** | Сессии администраторов | admin_user_id |

### D-001: B2B User Model

```sql
-- Клиенты (компании)
CREATE TABLE clients (
  id UUID PK,
  public_id VARCHAR(20) UNIQUE,  -- CL-XXXXXX
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  inn VARCHAR(12),
  ...
);

-- Администраторы
CREATE TABLE admin_users (
  id UUID PK,
  public_id VARCHAR(20) UNIQUE,  -- ADM-XXXXXX
  email VARCHAR(255) UNIQUE,
  role VARCHAR(20) CHECK (role IN ('admin', 'superadmin', 'manager')),
  ...
);

-- 🔐 ПРАВИЛО: Владелец бизнес-сущностей = client_id (не user_id)
```

### D-004: Meters Model

```sql
CREATE TABLE order_items (
  id UUID PK,
  order_id UUID FK,
  fabric_id UUID,
  color VARCHAR(50),
  requested_meters DECIMAL(10,2),    -- Заказано метров
  fulfilled_meters DECIMAL(10,2),    -- Отгружено метров
  unit_price_per_meter DECIMAL(10,2),
  rolls INTEGER,                     -- BR-ITEM-001: ceil(meters / rollLength)
  roll_allocations JSONB,            -- Конкретные рулоны
  total_price DECIMAL(12,2),
  ...
);
```

**⚠️ ВАЖНО:** `requested_meters DECIMAL`, не `quantity INT`

### D-002: Saga Orchestration

```sql
CREATE TABLE saga_orchestration (
  id UUID PK,
  saga_type VARCHAR(50),            -- order_creation, payment_processing, etc.
  saga_status VARCHAR(20),          -- initiated, in_progress, completed, failed
  current_step VARCHAR(100),        -- 🚨 DERIVED FIELD (via trigger)
  payload JSONB,
  timeout_at TIMESTAMP,             -- Explicit deadline
  ...
);

CREATE TABLE saga_steps (
  id UUID PK,
  saga_id UUID FK,
  step_number INTEGER,
  step_name VARCHAR(100),
  step_status VARCHAR(20),          -- pending, completed, failed, compensated
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  ...
);

-- ⚠️ CRITICAL: current_step = DERIVED FIELD
-- Source of truth: SELECT MAX(step_number) FROM saga_steps WHERE saga_id = X
-- Updated via trigger on saga_steps INSERT/UPDATE
```

### Ownership Model

| Entity | Owner | Actor |
|--------|-------|-------|
| orders | client_id | created_by_admin_id |
| order_items | (via order → client) | — |
| idempotent_requests | client_id | admin_user_id |
| sessions | — | admin_user_id |

---

## 🔐 Key Architectural Decisions

### D-001: User Model (B2B)

✅ **Chosen:** `clients` + `admin_users`

**Rationale:**
- Bazar Buy is B2B wholesale platform
- Clients = юридические лица, not physical persons
- Support corporate contracts, credit limits, multiple users per company
- publicId (CL-XXXXXX) important for business processes

**Rule:**
```
❌ Never use user_id for business ownership
✅ Use client_id for business entities (orders, etc.)
✅ Use admin_user_id for actions/actors
```

---

### D-002: Saga Orchestration

✅ **Chosen:** `saga_orchestration` + `saga_steps` (Enterprise-grade)

**Features:**
- Type-safe ENUMs (saga_type, saga_status, saga_step_status)
- Full traceability via saga_steps
- **CRITICAL:** `current_step` = DERIVED field (not source of truth)
- Explicit timeout support
- Compensation handling for rollback

**Usage Example:**

```typescript
// 1. Create saga
const saga = await prisma.sagaOrchestration.create({
  data: {
    sagaType: 'ORDER_CREATION',
    sagaStatus: 'INITIATED',
    requestId: uuid(),
    payload: { orderId, items: [...] },
    timeoutAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min timeout
  },
});

// 2. Execute step 1: Reserve stock
await prisma.sagaStep.create({
  data: {
    sagaId: saga.id,
    stepNumber: 1,
    stepName: 'RESERVE_STOCK',
    stepStatus: 'PENDING',
    inputData: { items: [...] },
  },
});

// 3. On success, create step 2
await prisma.sagaStep.create({
  data: {
    sagaId: saga.id,
    stepNumber: 2,
    stepName: 'PROCESS_PAYMENT',
    stepStatus: 'PENDING',
    inputData: { amount, orderId },
  },
});

// 4. current_step auto-updates via trigger
// SELECT current_step FROM saga_orchestration WHERE id = saga.id
// → 'PROCESS_PAYMENT'
```

---

### D-004: Meters Model

✅ **Chosen:** `requested_meters DECIMAL(10,2)`

**Why not quantity?**
- Bazar Buy sells fabric by meters, not by units
- Roll logic is critical for warehouse
- BR-ITEM-001: `rolls = ceil(requested_meters / fabric.roll_length)`

**Example:**

```sql
-- Customer orders 5.5 meters of fabric (roll length = 5 meters)
INSERT INTO order_items (
  fabric_id, requested_meters, unit_price_per_meter, rolls
) VALUES (
  'fab-123', 5.5, 100.00, 2  -- 2 rolls = ceil(5.5 / 5)
);
```

---

### D-003: Order Status

✅ **Chosen:** `processing` (not `in_progress`)

**Order Status Enum:**
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → CANCELLED
```

---

### D-005: Business Rules Numbering

✅ **Chosen:** `BR-{MODULE}-{NUMBER}`

**Examples:**
- `BR-ITEM-001`: Roll calculation
- `BR-CART-002`: Minimum order value
- `BR-ORDER-003`: Payment deadline

---

### D-006: API Versioning

✅ **Chosen:** `/api/v1/`

**Routing:**
```
GET  /api/v1/clients
POST /api/v1/clients
GET  /api/v1/clients/:id
PATCH /api/v1/clients/:id

GET  /api/v1/orders
POST /api/v1/orders
GET  /api/v1/orders/:id
```

---

## 🛣️ API Routes (Phase 2+)

```
/api/v1/
├── /clients               # B2B client management
│   ├── GET /            (list)
│   ├── POST /           (create)
│   ├── GET /:id         (detail)
│   ├── PATCH /:id       (update)
│   └── DELETE /:id      (soft delete)
│
├── /auth                 # Authentication
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /refresh
│   └── GET /me
│
├── /orders               # Order management
│   ├── GET /            (list, with filters)
│   ├── POST /           (create)
│   ├── GET /:id         (detail)
│   ├── PATCH /:id       (update)
│   └── DELETE /:id      (cancel)
│
├── /catalog              # Product catalog
│   ├── GET /products    (list, with filters & pagination)
│   ├── GET /products/:id
│   ├── GET /categories
│   └── POST /search
│
├── /cabinet              # Personal cabinet
│   ├── GET /profile
│   ├── PATCH /profile
│   ├── GET /orders
│   └── GET /addresses
│
├── /admin                # Admin panel (requires auth)
│   ├── GET /dashboard
│   ├── GET /analytics
│   └── ...
│
└── /health               # Health check
    └── GET /            (returns {status: 'ok'})
```

---

## 🔄 Request/Response Cycle

### Request Flow

```
1. Browser Request
   ↓
2. Frontend (Zustand store, Axios)
   ↓
3. Backend (Express middleware)
   - CORS check
   - Request ID (UUID v4)
   - Logger
   - Auth middleware (JWT)
   - Validation (Joi/Zod)
   ↓
4. Route Handler
   ↓
5. Service Layer (Business logic)
   ↓
6. Prisma ORM
   ↓
7. PostgreSQL
   ↓
8. Response (JSON)
   ↓
9. Frontend (Zustand update)
   ↓
10. UI Re-render
```

### Error Handling

```typescript
// Middleware catches all errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.status || 500).json({
    error: err.message,
    requestId: req.id,    // For tracing
    timestamp: new Date().toISOString(),
  });
});
```

---

## 🔑 Key Points to Remember

### ✅ Do's

✅ Use `client_id` for business ownership  
✅ Always create idempotency key for POST requests  
✅ Log with requestId for tracing  
✅ Use DERIVED fields (view them as computed)  
✅ Use Prisma migrations for schema changes  
✅ Validate input with Joi/Zod  
✅ Catch errors and return meaningful messages  
✅ Use transactions for multi-step operations  

### ❌ Don'ts

❌ Never use `user_id` for business ownership  
❌ Don't modify `current_step` directly (it's DERIVED)  
❌ Don't skip validation  
❌ Don't hardcode environment variables  
❌ Don't commit `.env.local`  
❌ Don't use `quantity INT` (use `meters DECIMAL`)  
❌ Don't bypass idempotency checks  

---

## 🗂️ File Organization

### Backend Structure

```
backend/src/
├── api/
│   ├── clients/
│   │   ├── clients.controller.ts    # Handle HTTP requests
│   │   ├── clients.service.ts       # Business logic
│   │   ├── clients.schema.ts        # Validation (Joi/Zod)
│   │   └── clients.routes.ts        # Express router
│   │
│   └── orders/
│       ├── orders.controller.ts
│       ├── orders.service.ts
│       ├── orders.schema.ts
│       └── orders.routes.ts
│
├── db/
│   ├── seed.ts                      # Seed test data
│   └── utils.ts                     # DB helpers
│
├── middleware/
│   ├── logger.ts                    # Request logging
│   ├── auth.ts                      # JWT validation
│   ├── validation.ts                # Joi/Zod middleware
│   └── errorHandler.ts              # Error handling
│
├── routes/
│   ├── index.ts                     # Register all routes
│   ├── clients.ts
│   ├── orders.ts
│   ├── catalog.ts
│   └── auth.ts
│
└── server.ts                        # Express app, listen()
```

### Frontend Structure

```
frontend/src/
├── pages/
│   ├── Home.tsx
│   ├── Catalog.tsx
│   ├── Product.tsx
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   ├── Cabinet.tsx
│   └── NotFound.tsx
│
├── components/
│   ├── Header/
│   │   ├── Header.tsx
│   │   └── Header.css
│   ├── Footer/
│   ├── ProductCard/
│   ├── CartItem/
│   └── Button/
│
├── hooks/
│   ├── useAuth.ts                   # Auth context
│   ├── useCart.ts                   # Zustand store
│   └── useFetch.ts                  # API calls
│
├── types/
│   ├── api.ts                       # API response types
│   ├── models.ts                    # Domain models
│   └── components.ts                # Component props
│
├── utils/
│   ├── api.ts                       # API helper functions
│   ├── formatting.ts                # Format date, price, etc.
│   └── validation.ts                # Frontend validation
│
├── api/
│   ├── client.ts                    # Axios instance
│   ├── endpoints.ts                 # API constants
│   └── services/                    # API service methods
│
├── styles/
│   ├── index.css
│   ├── variables.css
│   └── [component].css
│
├── App.tsx                          # Router setup
└── main.tsx                         # React entry
```

---

## 🚀 Technology Stack

### Backend

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.18+ |
| Language | TypeScript 5.3+ |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Validation | Joi / Zod |
| Auth | better-auth (Phase 2+) |
| Testing | Jest |
| Linting | ESLint + Prettier |

### Frontend

| Layer | Technology |
|-------|------------|
| Framework | React 18.2+ |
| Language | TypeScript 5.3+ |
| Build | Vite 5.0+ |
| Router | React Router v6 |
| State | Zustand |
| HTTP | Axios |
| Styling | CSS / Sass |
| Linting | ESLint |

### DevOps

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL 16 (Docker) |
| Admin DB | pgAdmin |
| Versioning | Git |
| CI/CD | GitHub Actions (Phase 2+) |

---

## 📖 Documentation References

- [Data Dictionary](../backend/prisma/schema.prisma) — Database schema
- [API Routes](./PHASE1_REPORT.md) — Phase 2 todo
- [ТЗ](../../memory/ТЗ_Книга.md) — Original specifications
- [Decisions](../../memory/ТЗ_Книга.md#decisions) — D-001 through D-006

---

**Version:** 1.0  
**Last Updated:** 2026-02-15  
**Author:** Subagent (PHASE 1)  
**Status:** CANONICAL  

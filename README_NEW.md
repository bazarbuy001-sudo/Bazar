# Bazar Buy - Node.js + Express + React + TypeScript

> **PHASE 1 (ФУНДАМЕНТ):** Переделка с WordPress на современный стек
>
> **Статус:** 🚀 Архитектура готова, скелеты созданы
>
> **Дата:** 2026-02-15

## 📋 Что здесь

```
fabric-store-new/
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── api/               # API handlers (handlers, services)
│   │   ├── db/                # Database utilities, seed, migrations
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/            # API routes (/api/v1/...)
│   │   └── server.ts          # Entry point
│   ├── prisma/
│   │   └── schema.prisma      # ✅ CANONICAL DATA MODEL
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utility functions
│   │   ├── api/               # API client
│   │   ├── styles/            # Global & component styles
│   │   ├── App.tsx            # Root component
│   │   └── main.tsx           # Entry point
│   ├── public/                # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts         # ✅ Configured with path aliases
│   └── index.html
│
├── docker-compose.yml         # ✅ PostgreSQL + pgAdmin
├── .env.example               # Environment variables
└── README.md                  # Вы здесь
```

## 🏗️ Архитектура

### ✅ Database Schema (CANONICAL)

Из ТЗ согласно **D-001, D-002, D-004**:

- **clients** — Юридические лица (B2B модель)
- **admin_users** — Администраторы системы
- **orders** — Заказы
- **order_items** — Позиции (метражная модель)
- **saga_orchestration** — Асинхронные саги
- **saga_steps** — Шаги саг (source of truth)
- **idempotent_requests** — Идемпотентность
- **sessions** — Сессии администраторов

### 🔐 Важные моменты

1. **D-001: B2B модель** — `clients` (компании) + `admin_users` (сотрудники)
2. **D-002: Saga Pattern** — `saga_orchestration` + `saga_steps`
3. **D-004: Метражная модель** — `requested_meters DECIMAL`, не `quantity INT`
4. **D-006: API versioning** — `/api/v1/`
5. **Idempotency** — `idempotent_requests` с UUID v4 ключом

## 🚀 Быстрый старт

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16 (или Docker)

### 1. Setup

```bash
# Клонируй старый проект для визуальной части
cp -r /Users/bazarbuy/Desktop/fabric-store/frontend/css ./frontend/src/styles/
cp -r /Users/bazarbuy/Desktop/fabric-store/frontend/images ./frontend/public/

# Установка зависимостей
cd backend && npm install
cd ../frontend && npm install
```

### 2. Database

```bash
# Запусти PostgreSQL через Docker
docker-compose up -d

# Проверь здоровье
docker-compose ps

# Создай миграции Prisma
cd backend
npm run db:push

# (Опционально) Заполни тестовые данные
npm run seed

# (Опционально) Открой UI
npm run db:studio
```

### 3. Backend

```bash
cd backend
npm run dev

# Проверь health
curl http://localhost:3000/api/v1/health
```

### 4. Frontend

```bash
cd frontend
npm run dev

# Откроется http://localhost:5173
```

## 📝 Next Steps (PHASE 2)

- [ ] Интегрировать визуальную часть из старого проекта (`/frontend/*.html` → React компоненты)
- [ ] Реализовать API endpoints для каталога, поиска, заказов
- [ ] Настроить WebSocket для real-time обновлений
- [ ] Интегрировать Auth (better-auth или Clerk)
- [ ] Email notifications (agentmail)
- [ ] Payment processing (CDEK, платежи)
- [ ] Admin panel

## 🔗 Связь с ТЗ

Все архитектурные решения взяты из:
- `/memory/ТЗ_Книга.md` — CANONICAL
- DECISIONS.md (D-001, D-002, D-003, D-004, D-005, D-006)
- DATA_DICTIONARY.md (schema)
- STATE_MACHINES.md (transitions)

## 📚 Дополнительно

### Path Aliases

```typescript
// Вместо ../../api/client
import { fetchProducts } from '@api/products';

// Вместо ../../../../components/Button
import Button from '@components/Button';
```

### Environment Variables

```bash
# Копируй .env.example в .env.local
cp .env.example .env.local

# Отредактируй для своей среды
# НЕ коммитьте .env.local в git!
```

### Type Safety

Весь код пишется на **TypeScript** strict mode:

```bash
# Backend
npm run lint
npm run type-check

# Frontend
npm run type-check
npm run lint
```

## 🛠️ Команды

### Backend

```bash
npm run dev              # Development server
npm run build            # Build to dist/
npm run start            # Production
npm run db:migrate       # Prisma migrations
npm run db:push          # Push schema to DB
npm run db:studio        # Open Prisma Studio
npm run seed             # Seed test data
npm run lint             # ESLint
npm run test             # Jest
```

### Frontend

```bash
npm run dev              # Development
npm run build            # Build
npm run preview          # Preview build
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

## 📖 Документация

- **Backend API:** [backend/README.md](backend/README.md) (в разработке)
- **Frontend Guide:** [frontend/README.md](frontend/README.md) (в разработке)
- **Database:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- **ТЗ:** `/memory/ТЗ_Книга.md`

## 🔄 Git Flow

```bash
# Создай ветку для Phase 2
git checkout -b phase-2-api-integration

# Commit с reference на D-xxx решения
git commit -m "feat: orders API endpoint (D-001, D-004)"

# Push и создай PR
git push origin phase-2-api-integration
```

---

**Создано:** 2026-02-15 ФУНДАМЕНТ ГОТОВ  
**Статус:** ✅ Архитектура консистентна  
**Следующий этап:** Phase 2 — Интеграция визуальной части + API endpoints  


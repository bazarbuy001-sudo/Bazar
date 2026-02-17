-- CreateEnum
CREATE TYPE "SagaType" AS ENUM ('ORDER_CREATION', 'ORDER_CANCELLATION', 'PAYMENT_PROCESSING', 'STOCK_RESERVATION');

-- CreateEnum
CREATE TYPE "SagaStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'COMPENSATED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPERADMIN', 'MANAGER');

-- CreateTable clients
CREATE TABLE "clients" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "publicId" varchar(20) NOT NULL,
    "email" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "phone" varchar(20),
    "city" varchar(100),
    "inn" varchar(12),
    "primaryAuthMethod" varchar(20) NOT NULL DEFAULT 'email',
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable admin_users
CREATE TABLE "admin_users" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "publicId" varchar(20) NOT NULL,
    "email" varchar(255) NOT NULL,
    "passwordHash" varchar(255) NOT NULL,
    "firstName" varchar(100),
    "lastName" varchar(100),
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" boolean NOT NULL DEFAULT true,
    "lastLoginAt" timestamptz,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable orders
CREATE TABLE "orders" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "publicId" varchar(20) NOT NULL,
    "clientId" uuid NOT NULL,
    "createdByAdminId" uuid,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" numeric(12,2) NOT NULL,
    "currency" varchar(3) NOT NULL DEFAULT 'RUB',
    "shippingAddress" jsonb,
    "notes" text,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable order_items
CREATE TABLE "order_items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "orderId" uuid NOT NULL,
    "fabricId" uuid NOT NULL,
    "color" varchar(50) NOT NULL,
    "requestedMeters" numeric(10,2) NOT NULL,
    "fulfilledMeters" numeric(10,2),
    "unitPricePerMeter" numeric(10,2) NOT NULL,
    "rolls" integer,
    "rollAllocations" jsonb,
    "totalPrice" numeric(12,2) NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable saga_orchestration
CREATE TABLE "saga_orchestration" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "sagaType" "SagaType" NOT NULL,
    "sagaStatus" "SagaStatus" NOT NULL DEFAULT 'INITIATED',
    "requestId" uuid NOT NULL,
    "currentStep" varchar(100),
    "payload" jsonb NOT NULL,
    "startedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" timestamptz,
    "timeoutAt" timestamptz,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saga_orchestration_pkey" PRIMARY KEY ("id")
);

-- CreateTable saga_steps
CREATE TABLE "saga_steps" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "sagaId" uuid NOT NULL,
    "stepNumber" integer NOT NULL,
    "stepName" varchar(100) NOT NULL,
    "stepStatus" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "inputData" jsonb,
    "outputData" jsonb,
    "errorMessage" text,
    "startedAt" timestamptz,
    "completedAt" timestamptz,

    CONSTRAINT "saga_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable idempotent_requests
CREATE TABLE "idempotent_requests" (
    "idempotencyKey" char(36) NOT NULL,
    "clientId" uuid NOT NULL,
    "adminUserId" uuid,
    "requestHash" varchar(64) NOT NULL,
    "responseStatus" integer,
    "responseBody" jsonb,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" timestamptz NOT NULL,

    CONSTRAINT "idempotent_requests_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateTable sessions
CREATE TABLE "sessions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "adminUserId" uuid NOT NULL,
    "tokenHash" varchar(64) NOT NULL,
    "ipAddress" inet,
    "userAgent" text,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" timestamptz NOT NULL,
    "lastActivityAt" timestamptz,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_publicId_key" ON "clients"("publicId");
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");
CREATE INDEX "clients_email_idx" ON "clients"("email");
CREATE INDEX "clients_publicId_idx" ON "clients"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_publicId_key" ON "admin_users"("publicId");
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");
CREATE INDEX "admin_users_role_idx" ON "admin_users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "orders_publicId_key" ON "orders"("publicId");
CREATE INDEX "orders_clientId_idx" ON "orders"("clientId");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "saga_orchestration_sagaStatus_idx" ON "saga_orchestration"("sagaStatus");
CREATE INDEX "saga_orchestration_sagaType_idx" ON "saga_orchestration"("sagaType");

-- CreateIndex
CREATE UNIQUE INDEX "saga_steps_sagaId_stepNumber_key" ON "saga_steps"("sagaId", "stepNumber");
CREATE INDEX "saga_steps_sagaId_stepNumber_idx" ON "saga_steps"("sagaId", "stepNumber");

-- CreateIndex
CREATE INDEX "idempotent_requests_clientId_idx" ON "idempotent_requests"("clientId");
CREATE INDEX "idempotent_requests_expiresAt_idx" ON "idempotent_requests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_adminUserId_isActive_idx" ON "sessions"("adminUserId", "isActive");
CREATE INDEX "sessions_tokenHash_idx" ON "sessions"("tokenHash");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saga_steps" ADD CONSTRAINT "saga_steps_sagaId_fkey" FOREIGN KEY ("sagaId") REFERENCES "saga_orchestration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotent_requests" ADD CONSTRAINT "idempotent_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "idempotent_requests" ADD CONSTRAINT "idempotent_requests_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

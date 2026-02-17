-- Categories table
CREATE TABLE IF NOT EXISTS "categories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "type" text NOT NULL,
    "description" text,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_name_key" UNIQUE ("name")
);

-- SubCategories table
CREATE TABLE IF NOT EXISTS "subcategories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" uuid NOT NULL,
    "name" text NOT NULL,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE,
    CONSTRAINT "subcategories_categoryId_name_key" UNIQUE ("categoryId", "name")
);

-- Products table
CREATE TABLE IF NOT EXISTS "products" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "publicId" text NOT NULL,
    "name" text NOT NULL,
    "articleNumber" text,
    "productType" text NOT NULL DEFAULT 'FABRIC',
    "categoryId" uuid NOT NULL,
    "subcategoryId" uuid NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "oldPrice" numeric(10,2),
    "isOnSale" boolean NOT NULL DEFAULT false,
    "isNew" boolean NOT NULL DEFAULT false,
    "isRestRoll" boolean NOT NULL DEFAULT false,
    "warehouseAvailability" numeric(10,2) NOT NULL DEFAULT 0,
    "color" text,
    "shade" text,
    "widthCm" numeric(10,2),
    "densityGsm" numeric(10,2),
    "densityGpm" numeric(10,2),
    "pattern" text,
    "printType" text,
    "fabricSubtype" text,
    "fabricProperties" text,
    "purpose" text,
    "metersPerRoll" numeric(10,2),
    "metersPerKg" numeric(10,2),
    "minimumCut" integer,
    "countryOfOrigin" text,
    "material" text,
    "accessoryType" text,
    "size" text,
    "application" text,
    "finish" text,
    "brand" text,
    "packageType" text,
    "mountingType" text,
    "colors" jsonb DEFAULT '[]'::jsonb,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_publicId_key" UNIQUE ("publicId"),
    CONSTRAINT "products_articleNumber_key" UNIQUE ("articleNumber"),
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT,
    CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories" ("id") ON DELETE RESTRICT
);

-- FabricComposition table
CREATE TABLE IF NOT EXISTS "fabric_compositions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "productId" uuid NOT NULL,
    "material" text NOT NULL,
    "percentage" integer NOT NULL,
    CONSTRAINT "fabric_compositions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fabric_compositions_productId_material_key" UNIQUE ("productId", "material"),
    CONSTRAINT "fabric_compositions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE
);

-- ProductImage table
CREATE TABLE IF NOT EXISTS "product_images" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "productId" uuid NOT NULL,
    "imageUrl" text NOT NULL,
    "position" integer NOT NULL,
    "isMain" boolean NOT NULL DEFAULT false,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_images_productId_position_key" UNIQUE ("productId", "position"),
    CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE
);

-- Chat table
CREATE TABLE IF NOT EXISTS "chats" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "clientId" uuid NOT NULL,
    "assignedAdminId" uuid,
    "subject" text,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chats_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE,
    CONSTRAINT "chats_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "admin_users" ("id") ON DELETE SET NULL
);

-- Message table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "chatId" uuid NOT NULL,
    "senderId" text NOT NULL,
    "senderType" text NOT NULL,
    "content" text NOT NULL,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "categories_type_idx" ON "categories"("type");
CREATE INDEX "subcategories_categoryId_idx" ON "subcategories"("categoryId");
CREATE INDEX "products_productType_idx" ON "products"("productType");
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_subcategoryId_idx" ON "products"("subcategoryId");
CREATE INDEX "products_isOnSale_idx" ON "products"("isOnSale");
CREATE INDEX "products_isNew_idx" ON "products"("isNew");
CREATE INDEX "fabric_compositions_productId_idx" ON "fabric_compositions"("productId");
CREATE INDEX "fabric_compositions_material_idx" ON "fabric_compositions"("material");
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");
CREATE INDEX "chats_clientId_idx" ON "chats"("clientId");
CREATE INDEX "chats_assignedAdminId_idx" ON "chats"("assignedAdminId");
CREATE INDEX "chats_isActive_idx" ON "chats"("isActive");
CREATE INDEX "messages_chatId_idx" ON "messages"("chatId");
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

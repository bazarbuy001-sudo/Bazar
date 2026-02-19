/**
 * Product Seed Script
 * Добавляет 5 категорий + 20 реальных товаров для каталога
 */

import { PrismaClient, ProductType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

interface ProductData {
  name: string;
  categoryName: string;
  subcategoryName: string;
  price: number;
  oldPrice?: number;
  isOnSale?: boolean;
  isNew?: boolean;
  warehouseAvailability: number;
  color?: string;
  widthCm?: number;
  densityGsm?: number;
  colors: string[];
  description?: string;
}

const FABRIC_PRODUCTS: ProductData[] = [
  // АТЛАС (5 товаров)
  {
    name: "Атлас плательный однотонный",
    categoryName: "Одежные ткани", 
    subcategoryName: "атлас",
    price: 890,
    oldPrice: 1200,
    isOnSale: true,
    warehouseAvailability: 250,
    widthCm: 150,
    densityGsm: 120,
    colors: ["красный", "синий", "черный", "золотой", "серебряный"],
    description: "Элегантный атлас для вечерних платьев"
  },
  {
    name: "Атлас стрейч блестящий",
    categoryName: "Одежные ткани",
    subcategoryName: "атлас", 
    price: 1350,
    isNew: true,
    warehouseAvailability: 180,
    widthCm: 150,
    densityGsm: 140,
    colors: ["розовый", "фиолетовый", "изумрудный", "бордовый"],
    description: "Атлас с добавлением эластана для облегающих моделей"
  },
  {
    name: "Атлас креп двусторонний",
    categoryName: "Одежные ткани",
    subcategoryName: "атлас",
    price: 2100,
    warehouseAvailability: 120,
    widthCm: 140,
    densityGsm: 160,
    colors: ["белый", "кремовый", "пудровый", "серый"],
    description: "Премиальный двусторонний атлас"
  },
  {
    name: "Атлас подкладочный", 
    categoryName: "Одежные ткани",
    subcategoryName: "атлас",
    price: 450,
    warehouseAvailability: 400,
    widthCm: 150,
    densityGsm: 90,
    colors: ["черный", "белый", "бежевый", "темно-синий"],
    description: "Тонкий атлас для подкладки"
  },
  {
    name: "Атлас жаккард с узором",
    categoryName: "Одежные ткани", 
    subcategoryName: "атлас",
    price: 1800,
    oldPrice: 2200,
    isOnSale: true,
    warehouseAvailability: 90,
    widthCm: 140,
    densityGsm: 180,
    colors: ["золотой", "серебряный", "бронзовый"],
    description: "Жаккардовый атлас с рельефным узором"
  },

  // ХЛОПОК (5 товаров)
  {
    name: "Хлопок поплин классический",
    categoryName: "Одежные ткани",
    subcategoryName: "хлопок",
    price: 650,
    warehouseAvailability: 320,
    widthCm: 150,
    densityGsm: 110,
    colors: ["белый", "голубой", "розовый", "желтый", "зеленый"],
    description: "100% хлопок для рубашек и блузок"
  },
  {
    name: "Хлопок стрейч джинсовый",
    categoryName: "Одежные ткани",
    subcategoryName: "хлопок", 
    price: 980,
    isNew: true,
    warehouseAvailability: 280,
    widthCm: 150,
    densityGsm: 320,
    colors: ["синий", "черный", "серый", "белый"],
    description: "Эластичный хлопок для джинсов"
  },
  {
    name: "Хлопок сатин премиум",
    categoryName: "Одежные ткани",
    subcategoryName: "хлопок",
    price: 1200,
    warehouseAvailability: 200,
    widthCm: 160,
    densityGsm: 140,
    colors: ["белый", "кремовый", "светло-серый"],
    description: "Высококачественный хлопковый сатин"
  },
  {
    name: "Хлопок батист тонкий",
    categoryName: "Одежные ткани",
    subcategoryName: "хлопок",
    price: 750,
    warehouseAvailability: 150,
    widthCm: 140,
    densityGsm: 80,
    colors: ["белый", "кремовый", "светло-розовый", "голубой"],
    description: "Тонкий хлопок для летней одежды"
  },
  {
    name: "Хлопок канвас плотный",
    categoryName: "Одежные ткани", 
    subcategoryName: "хлопок",
    price: 890,
    warehouseAvailability: 240,
    widthCm: 150,
    densityGsm: 280,
    colors: ["хаки", "черный", "коричневый", "серый"],
    description: "Плотный хлопок для верхней одежды"
  },

  // ТРИКОТАЖ (5 товаров) 
  {
    name: "Трикотаж кулирка хлопок",
    categoryName: "Одежные ткани",
    subcategoryName: "трикотаж",
    price: 580,
    warehouseAvailability: 300,
    widthCm: 180,
    densityGsm: 160,
    colors: ["белый", "черный", "серый", "розовый", "голубой"],
    description: "Мягкая кулирка для футболок"
  },
  {
    name: "Трикотаж интерлок двунитка",
    categoryName: "Одежные ткани",
    subcategoryName: "трикотаж", 
    price: 720,
    isNew: true,
    warehouseAvailability: 280,
    widthCm: 180,
    densityGsm: 200,
    colors: ["белый", "черный", "серый", "темно-синий"],
    description: "Плотный интерлок для базовых вещей"
  },
  {
    name: "Трикотаж футер с начесом",
    categoryName: "Одежные ткани",
    subcategoryName: "трикотаж",
    price: 850,
    warehouseAvailability: 220,
    widthCm: 180,
    densityGsm: 280,
    colors: ["серый", "черный", "темно-синий", "бордовый"],
    description: "Теплый футер для худи и свитшотов"
  },
  {
    name: "Трикотаж рибана резинка",
    categoryName: "Одежные ткани",
    subcategoryName: "трикотаж",
    price: 650,
    warehouseAvailability: 180,
    widthCm: 150,
    densityGsm: 220,
    colors: ["белый", "черный", "серый", "розовый"],
    description: "Эластичная рибана для манжет"
  },
  {
    name: "Трикотаж джерси вискоза",
    categoryName: "Одежные ткани",
    subcategoryName: "трикотаж", 
    price: 1180,
    oldPrice: 1400,
    isOnSale: true,
    warehouseAvailability: 160,
    widthCm: 150,
    densityGsm: 180,
    colors: ["черный", "темно-синий", "бордовый", "зеленый"],
    description: "Струящийся трикотаж для платьев"
  },

  // ШИФОН (3 товара)
  {
    name: "Шифон креп однотонный",
    categoryName: "Одежные ткани",
    subcategoryName: "шифон",
    price: 1150,
    warehouseAvailability: 140,
    widthCm: 150,
    densityGsm: 60,
    colors: ["белый", "черный", "розовый", "голубой", "фиолетовый"],
    description: "Нежный шифон для блузок"
  },
  {
    name: "Шифон с люрексом праздничный", 
    categoryName: "Одежные ткани",
    subcategoryName: "шифон",
    price: 1650,
    isNew: true,
    warehouseAvailability: 80,
    widthCm: 150,
    densityGsm: 70,
    colors: ["золотой", "серебряный", "розовое золото"],
    description: "Шифон с блестящей нитью"
  },
  {
    name: "Шифон принт цветочный",
    categoryName: "Одежные ткани", 
    subcategoryName: "шифон",
    price: 1350,
    oldPrice: 1600,
    isOnSale: true,
    warehouseAvailability: 100,
    widthCm: 140,
    densityGsm: 65,
    colors: ["мультиколор"],
    description: "Шифон с цветочным принтом"
  },

  // МОЛНИИ (2 товара фурнитуры)
  {
    name: "Молния спираль разъемная 60см",
    categoryName: "Швейная фурнитура",
    subcategoryName: "молнии", 
    price: 180,
    warehouseAvailability: 500,
    colors: ["черный", "белый", "серый", "темно-синий", "коричневый"],
    description: "Качественная разъемная молния для курток"
  },
  {
    name: "Молния потайная 20см",
    categoryName: "Швейная фурнитура",
    subcategoryName: "молнии",
    price: 65,
    warehouseAvailability: 800, 
    colors: ["черный", "белый", "бежевый", "темно-синий"],
    description: "Потайная молния для платьев"
  }
];

async function seedProducts() {
  console.log('🌱 Seeding products...');

  // Получаем категории из базы
  const categories = await prisma.category.findMany({
    include: {
      subcategories: true
    }
  });

  const categoryMap = new Map();
  const subcategoryMap = new Map();
  
  for (const category of categories) {
    categoryMap.set(category.name, category.id);
    for (const sub of category.subcategories) {
      subcategoryMap.set(`${category.name}:${sub.name}`, sub.id);
    }
  }

  let productCount = 0;

  for (const productData of FABRIC_PRODUCTS) {
    const categoryId = categoryMap.get(productData.categoryName);
    const subcategoryId = subcategoryMap.get(`${productData.categoryName}:${productData.subcategoryName}`);

    if (!categoryId || !subcategoryId) {
      console.warn(`⚠️  Category/subcategory not found for: ${productData.name}`);
      continue;
    }

    // Генерируем SKU
    const sku = `FAB-${(productCount + 1).toString().padStart(4, '0')}`;

    const product = await prisma.product.create({
      data: {
        publicId: sku,
        name: productData.name,
        productType: productData.categoryName === 'Швейная фурнитура' ? 'ACCESSORY' : 'FABRIC',
        categoryId,
        subcategoryId,
        price: new Decimal(productData.price),
        oldPrice: productData.oldPrice ? new Decimal(productData.oldPrice) : null,
        isOnSale: productData.isOnSale || false,
        isNew: productData.isNew || false,
        warehouseAvailability: new Decimal(productData.warehouseAvailability),
        color: productData.colors[0], // Основной цвет
        colors: productData.colors,
        widthCm: productData.widthCm ? new Decimal(productData.widthCm) : null,
        densityGsm: productData.densityGsm ? new Decimal(productData.densityGsm) : null,
        metersPerRoll: productData.categoryName !== 'Швейная фурнитура' ? new Decimal(100) : null,
        minimumCut: productData.categoryName !== 'Швейная фурнитура' ? 1 : null,
        countryOfOrigin: 'Россия'
      }
    });

    productCount++;
    console.log(`✅ Created: ${product.name} (${product.publicId})`);
  }

  console.log(`🎉 Seeded ${productCount} products!`);
}

async function main() {
  try {
    await seedProducts();
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Создаю админа
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.adminUser.create({
    data: {
      publicId: 'ADM-000001',
      email: 'admin@bazarbuy.com',
      passwordHash: adminPassword,
      firstName: 'Админ',
      lastName: 'Системы',
      role: 'superadmin',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // 2. Создаю 5 категорий тканей
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: 'Атлас', slug: 'atlas', level: 1, position: 1 },
    }),
    prisma.category.create({
      data: { name: 'Шёлк', slug: 'silk', level: 1, position: 2 },
    }),
    prisma.category.create({
      data: { name: 'Бархат', slug: 'velvet', level: 1, position: 3 },
    }),
    prisma.category.create({
      data: { name: 'Хлопок', slug: 'cotton', level: 1, position: 4 },
    }),
    prisma.category.create({
      data: { name: 'Фурнитура', slug: 'accessories', level: 1, position: 5 },
    }),
  ]);
  console.log('✅ Categories created:', categories.length);

  // 3. Создаю товары с вариантами
  const fabricData = [
    // АТЛАС
    {
      categoryId: categories[0].id,
      name: 'Атлас королевский плотный',
      price: 850,
      rollLength: 25,
      variants: [
        { colorName: 'Бордовый', colorHex: '#722F37' },
        { colorName: 'Золотой', colorHex: '#FFD700' },
        { colorName: 'Синий королевский', colorHex: '#4169E1' },
      ],
    },
    {
      categoryId: categories[0].id,
      name: 'Атлас стрейч матовый',
      price: 650,
      rollLength: 30,
      variants: [
        { colorName: 'Чёрный', colorHex: '#000000' },
        { colorName: 'Белый', colorHex: '#FFFFFF' },
        { colorName: 'Серебристый', colorHex: '#C0C0C0' },
      ],
    },
    {
      categoryId: categories[0].id,
      name: 'Атлас креп-сатин',
      price: 750,
      rollLength: 20,
      variants: [
        { colorName: 'Изумрудный', colorHex: '#50C878' },
        { colorName: 'Фиолетовый', colorHex: '#8A2BE2' },
      ],
    },
    // ШЁЛК
    {
      categoryId: categories[1].id,
      name: 'Шёлк натуральный Армани',
      price: 1200,
      rollLength: 22,
      variants: [
        { colorName: 'Пудра', colorHex: '#F5DEB3' },
        { colorName: 'Графит', colorHex: '#36454F' },
        { colorName: 'Молочный', colorHex: '#FEFCFF' },
      ],
    },
    {
      categoryId: categories[1].id,
      name: 'Шёлк шифон кристалл',
      price: 900,
      rollLength: 28,
      variants: [
        { colorName: 'Лавандовый', colorHex: '#E6E6FA' },
        { colorName: 'Персиковый', colorHex: '#FFCBA4' },
      ],
    },
    // БАРХАТ
    {
      categoryId: categories[2].id,
      name: 'Бархат премиум стрейч',
      price: 1100,
      rollLength: 24,
      variants: [
        { colorName: 'Тёмно-синий', colorHex: '#000080' },
        { colorName: 'Марсала', colorHex: '#B03A2E' },
        { colorName: 'Изумрудный', colorHex: '#2E8B57' },
      ],
    },
    {
      categoryId: categories[2].id,
      name: 'Бархат крэш мятый',
      price: 950,
      rollLength: 26,
      variants: [
        { colorName: 'Античное золото', colorHex: '#CD853F' },
        { colorName: 'Платина', colorHex: '#E5E4E2' },
      ],
    },
    // ХЛОПОК
    {
      categoryId: categories[3].id,
      name: 'Хлопок сатин премиум',
      price: 450,
      rollLength: 35,
      variants: [
        { colorName: 'Нежно-розовый', colorHex: '#FFC0CB' },
        { colorName: 'Мятный', colorHex: '#98FB98' },
        { colorName: 'Кремовый', colorHex: '#FFFDD0' },
      ],
    },
    {
      categoryId: categories[3].id,
      name: 'Хлопок поплин люкс',
      price: 380,
      rollLength: 40,
      variants: [
        { colorName: 'Небесно-голубой', colorHex: '#87CEEB' },
        { colorName: 'Коралловый', colorHex: '#FF7F50' },
      ],
    },
  ];

  // Создаю товары с вариантами
  for (const fabric of fabricData) {
    const product = await prisma.product.create({
      data: {
        name: fabric.name,
        slug: fabric.name.toLowerCase().replace(/\s+/g, '-'),
        productType: 'fabric',
        price: fabric.price,
        unit: 'METER',
        rollLength: fabric.rollLength,
        minOrderQty: 0.5,
        stepQty: 0.1,
        hasStock: true,
        stockQuantity: 100, // 100 метров на складе
        mainImage: `/images/fabrics/${fabric.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        description: `Высококачественная ткань ${fabric.name}. Ширина 150см. Плотность 200г/м².`,
      },
    });

    // Связываю с категорией
    await prisma.categoryProduct.create({
      data: {
        categoryId: fabric.categoryId,
        productId: product.id,
      },
    });

    // Создаю варианты цветов
    for (const variant of fabric.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          sku: `${product.slug}-${variant.colorName.toLowerCase()}`.replace(/\s+/g, '-'),
          inStock: true,
        },
      });
    }

    console.log(`✅ Product created: ${product.name} (${fabric.variants.length} variants)`);
  }

  // 4. Создаю фурнитуру
  const accessoryData = [
    {
      name: 'Пуговицы перламутровые 15мм',
      price: 25,
      unit: 'PIECE',
      variants: [
        { colorName: 'Белый', colorHex: '#FFFFFF' },
        { colorName: 'Кремовый', colorHex: '#FFFDD0' },
      ],
    },
    {
      name: 'Молния потайная 20см',
      price: 45,
      unit: 'PIECE',
      variants: [
        { colorName: 'Чёрный', colorHex: '#000000' },
        { colorName: 'Белый', colorHex: '#FFFFFF' },
        { colorName: 'Серый', colorHex: '#808080' },
      ],
    },
  ];

  for (const accessory of accessoryData) {
    const product = await prisma.product.create({
      data: {
        name: accessory.name,
        slug: accessory.name.toLowerCase().replace(/\s+/g, '-'),
        productType: 'accessory',
        price: accessory.price,
        unit: accessory.unit,
        minOrderQty: 1,
        stepQty: 1,
        hasStock: true,
        stockQuantity: 500, // 500 штук
        mainImage: `/images/accessories/${accessory.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        description: `Качественная фурнитура ${accessory.name}`,
      },
    });

    // Связываю с категорией "Фурнитура"
    await prisma.categoryProduct.create({
      data: {
        categoryId: categories[4].id,
        productId: product.id,
      },
    });

    // Создаю варианты
    for (const variant of accessory.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          sku: `${product.slug}-${variant.colorName.toLowerCase()}`.replace(/\s+/g, '-'),
          inStock: true,
        },
      });
    }

    console.log(`✅ Accessory created: ${product.name} (${accessory.variants.length} variants)`);
  }

  // 5. Создаю промокод
  const discount = await prisma.discount.create({
    data: {
      name: 'Новый клиент',
      type: 'PERCENT',
      value: 10, // 10%
      minOrderAmount: 1000,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 дней
    },
  });

  await prisma.promoCode.create({
    data: {
      code: 'NEWCLIENT10',
      discountId: discount.id,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 дней
      maxUses: 100,
    },
  });
  
  console.log('✅ Promo code created: NEWCLIENT10 (10% скидка)');

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
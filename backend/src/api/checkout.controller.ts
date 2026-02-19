import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { ApiResponse } from '../types.js';

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

const ShippingAddressSchema = z.object({
  city: z.string().min(1, 'City is required'),
  street: z.string().min(1, 'Street address is required'),
  phone: z.string().min(1, 'Phone is required'),
});

const CheckoutSubmitSchema = z.object({
  shippingAddress: ShippingAddressSchema,
  comment: z.string().optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Генерация номера заказа в формате ORD-YYYYMMDD-XXXX
 */
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Генерируем 4 случайные цифры
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `ORD-${dateStr}-${randomNum}`;
}

/**
 * Проверка наличия товара и актуальности цены
 */
async function validateCartItems(cartItems: any[]) {
  const validationResults = [];
  let hasStockIssues = false;
  let hasPriceChanges = false;

  for (const item of cartItems) {
    // Получаем актуальную информацию о товаре
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true,
        name: true,
        price: true,
        warehouseAvailability: true,
      },
    });

    if (!product) {
      validationResults.push({
        itemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        issue: 'PRODUCT_NOT_FOUND',
        message: 'Товар больше не доступен',
      });
      hasStockIssues = true;
      continue;
    }

    // Проверяем наличие
    if (Number(product.warehouseAvailability) < item.quantity) {
      validationResults.push({
        itemId: item.id,
        productId: item.productId,
        productName: product.name,
        issue: 'INSUFFICIENT_STOCK',
        message: `Недостаточно товара на складе. Доступно: ${product.warehouseAvailability}, запрашивается: ${item.quantity}`,
        available: Number(product.warehouseAvailability),
        requested: item.quantity,
      });
      hasStockIssues = true;
    }

    // Проверяем цену
    if (Number(product.price) !== Number(item.priceAtAdd)) {
      validationResults.push({
        itemId: item.id,
        productId: item.productId,
        productName: product.name,
        issue: 'PRICE_CHANGED',
        message: `Цена изменилась с ${item.priceAtAdd} до ${product.price}`,
        oldPrice: Number(item.priceAtAdd),
        newPrice: Number(product.price),
      });
      hasPriceChanges = true;
    }

    // Если всё ок, добавляем актуальную информацию
    if (Number(product.warehouseAvailability) >= item.quantity) {
      validationResults.push({
        itemId: item.id,
        productId: item.productId,
        productName: product.name,
        issue: null,
        currentPrice: Number(product.price),
        quantity: item.quantity,
        total: Number(product.price) * item.quantity,
      });
    }
  }

  return {
    validationResults,
    hasStockIssues,
    hasPriceChanges,
  };
}

// ============================================
// API CONTROLLERS
// ============================================

/**
 * POST /api/v1/checkout/init
 * Инициализация чекаута - проверка корзины и цен
 */
export const initCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.user?.id;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Получаем корзину пользователя
    const cart = await prisma.cart.findUnique({
      where: { clientId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                warehouseAvailability: true,
                images: {
                  where: { isMain: true },
                  select: { imageUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Cart is empty',
      });
      return;
    }

    // Проверяем каждый товар в корзине
    const validation = await validateCartItems(cart.items);

    // Подсчитываем итоги по актуальным ценам
    const validItems = validation.validationResults.filter(item => !item.issue || item.issue === 'PRICE_CHANGED');
    const subtotal = validItems.reduce((sum, item) => sum + (item.currentPrice || item.newPrice || 0) * item.quantity, 0);

    const warnings = validation.validationResults
      .filter(item => item.issue === 'PRICE_CHANGED')
      .map(item => ({
        type: 'PRICE_CHANGED',
        productName: item.productName,
        message: item.message,
        oldPrice: item.oldPrice,
        newPrice: item.newPrice,
      }));

    const errors = validation.validationResults
      .filter(item => item.issue && item.issue !== 'PRICE_CHANGED')
      .map(item => ({
        type: item.issue,
        productName: item.productName,
        message: item.message,
        available: item.available,
        requested: item.requested,
      }));

    const response: ApiResponse<any> = {
      success: !validation.hasStockIssues,
      data: {
        cart: {
          id: cart.id,
          items: cart.items.map(item => ({
            id: item.id,
            productId: item.productId,
            product: {
              name: item.product.name,
              imageUrl: item.product.images[0]?.imageUrl || null,
              currentPrice: Number(item.product.price),
              available: Number(item.product.warehouseAvailability),
            },
            quantity: item.quantity,
            priceAtAdd: Number(item.priceAtAdd),
            currentPrice: Number(item.product.price),
            priceChanged: Number(item.product.price) !== Number(item.priceAtAdd),
            total: Number(item.product.price) * item.quantity,
          })),
          subtotal: Number(subtotal.toFixed(2)),
          total: Number(subtotal.toFixed(2)),
        },
        validation: {
          hasStockIssues: validation.hasStockIssues,
          hasPriceChanges: validation.hasPriceChanges,
          warnings,
          errors,
        },
      },
    };

    if (validation.hasStockIssues) {
      response.error = 'Some items are out of stock or unavailable';
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/checkout/submit
 * Оформление заказа
 */
export const submitCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Валидация входных данных
    const result = CheckoutSubmitSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: result.error.issues,
      });
      return;
    }

    const { shippingAddress, comment } = result.data;
    const clientId = req.user?.id;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Используем транзакцию для атомарности
    const result_transaction = await prisma.$transaction(async (tx) => {
      // 1. Получаем корзину пользователя с блокировкой
      const cart = await tx.cart.findUnique({
        where: { clientId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  warehouseAvailability: true,
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // 2. Проверяем наличие товаров еще раз (в рамках транзакции)
      const validation = await validateCartItems(cart.items);
      
      if (validation.hasStockIssues) {
        throw new Error('Some items are out of stock');
      }

      // 3. Подсчитываем итоги
      const totalAmount = cart.items.reduce((sum, item) => {
        return sum + (Number(item.product.price) * item.quantity);
      }, 0);

      // 4. Генерируем номер заказа
      const orderNumber = generateOrderNumber();

      // 5. Создаем заказ
      const order = await tx.order.create({
        data: {
          publicId: orderNumber,
          clientId: clientId,
          status: 'PENDING',
          totalAmount: totalAmount,
          currency: 'RUB',
          shippingAddress: shippingAddress,
          notes: comment || null,
        },
      });

      // 6. Создаем позиции заказа
      const orderItems = [];
      for (const item of cart.items) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            fabricId: item.productId,
            color: 'default', // TODO: добавить поддержку цветов в корзине
            requestedMeters: item.quantity,
            unitPricePerMeter: Number(item.product.price),
            totalPrice: Number(item.product.price) * item.quantity,
          },
        });
        orderItems.push(orderItem);
      }

      // 7. Уменьшаем остатки на складе
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            warehouseAvailability: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 8. Очищаем корзину
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return {
        order: {
          ...order,
          items: orderItems,
        },
      };
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        orderId: result_transaction.order.id,
        orderNumber: result_transaction.order.publicId,
        total: Number(result_transaction.order.totalAmount),
        currency: result_transaction.order.currency,
        status: result_transaction.order.status.toLowerCase(),
        itemsCount: result_transaction.order.items.length,
        createdAt: result_transaction.order.createdAt.toISOString(),
      },
    };

    res.status(201).json(response);
  } catch (error: any) {
    if (error.message === 'Cart is empty') {
      res.status(400).json({
        success: false,
        error: 'Cart is empty',
      });
      return;
    }

    if (error.message === 'Some items are out of stock') {
      res.status(400).json({
        success: false,
        error: 'Some items are out of stock or unavailable',
      });
      return;
    }

    next(error);
  }
};
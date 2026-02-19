/**
 * Orders Controller v2
 * Управление заказами (создание, получение, отмена)
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/v2/orders
 * Создать заказ из корзины (из личного кабинета клиента)
 * 
 * Требует:
 * - clientId из auth token
 * - items: [{productId, color, meters, rolls}]
 * - shippingAddress (опционально): {city, street, building, etc}
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.clientId;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Items array is required and cannot be empty'
      });
      return;
    }

    // Валидировать и получить товары
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const { productId, color, meters, rolls } = item;

      if (!productId || !color || !meters) {
        res.status(400).json({
          success: false,
          error: 'Each item must have productId, color, and meters'
        });
        return;
      }

      // Получить товар
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        res.status(404).json({
          success: false,
          error: `Product ${productId} not found`
        });
        return;
      }

      // Валидация минимальной нарезки (для тканей)
      if (product.productType === 'FABRIC' && product.minimumCut) {
        if (meters < product.minimumCut) {
          res.status(400).json({
            success: false,
            error: `Product ${product.name} requires minimum ${product.minimumCut} meters, got ${meters}`
          });
          return;
        }
      }

      // Проверить наличие на складе
      if (product.warehouseAvailability < meters) {
        res.status(400).json({
          success: false,
          error: `Product ${product.name} has only ${product.warehouseAvailability}m available, requested ${meters}m`
        });
        return;
      }

      // Рассчитать рулоны для тканей
      const calculatedRolls = product.productType === 'FABRIC' 
        ? Math.ceil(meters / (product.metersPerRoll?.toNumber() || 100))
        : rolls || 1;

      // Рассчитать цену
      const pricePerUnit = Number(product.price.toString());
      const itemPrice = product.productType === 'FABRIC'
        ? pricePerUnit * meters  // Цена за метр
        : pricePerUnit * (rolls || 1);  // Цена за штуку

      totalAmount += itemPrice;

      orderItemsData.push({
        fabricId: productId,
        color,
        requestedMeters: meters,
        rolls: calculatedRolls,
        unitPricePerMeter: product.price.toString(),
        totalPrice: itemPrice.toString()
      });
    }

    // Создать заказ
    const order = await prisma.order.create({
      data: {
        publicId: `ORD-${new Date().getFullYear()}-${Math.random().toString().slice(2, 8).padStart(6, '0')}`,
        clientId,
        status: 'PENDING',
        totalAmount: totalAmount,
        currency: 'RUB',
        shippingAddress: shippingAddress || null,
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: true
      }
    });

    // Уменьшить наличие на складе
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (product) {
        const currentAvailability = Number(product.warehouseAvailability.toString());
        const newAvailability = Math.max(0, currentAvailability - item.meters);
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            warehouseAvailability: newAvailability
          }
        });
      }
    }

    // Создать чат для согласования с менеджером
    const chat = await prisma.chat.create({
      data: {
        clientId,
        subject: `Заказ ${order.publicId}`,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.id,
        publicId: order.publicId,
        totalAmount: order.totalAmount,
        status: order.status,
        chatId: chat.id,
        items: order.items
      }
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order'
    });
  }
};

/**
 * GET /api/v2/orders/:orderId
 * Получить детали заказа (для админа)
 */
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order'
    });
  }
};

/**
 * GET /api/v2/orders
 * Получить все заказы (для админа с фильтрацией)
 */
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, clientId, page = 1, limit = 20 } = req.query;

    const where: any = {};
    if (status) where.status = status.toString().toUpperCase();
    if (clientId) where.clientId = clientId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.order.count({ where });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    });
  }
};

/**
 * PUT /api/v2/orders/:orderId/status
 * Обновить статус заказа (для админа)
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    // Валидация переходов (简単 state machine)
    const validTransitions: any = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Cannot transition from ${order.status} to ${status}`
      });
      return;
    }

    // Если отмена - вернуть наличие на склад
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const items = await prisma.orderItem.findMany({
        where: { orderId }
      });

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.fabricId }
        });

        if (product) {
          await prisma.product.update({
            where: { id: item.fabricId },
            data: {
              warehouseAvailability: Number(product.warehouseAvailability.toString()) + Number(item.requestedMeters.toString())
            }
          });
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order status'
    });
  }
};

/**
 * GET /api/v2/orders/stats
 * Статистика по заказам (для админа)
 */
export const getOrderStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      }
    });

    const total = await prisma.order.count();
    const totalRevenue = await prisma.order.aggregate({
      _sum: {
        totalAmount: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        byStatus: stats
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch order stats'
    });
  }
};

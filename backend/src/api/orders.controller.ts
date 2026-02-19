import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server.js';
import { ApiResponse, PaginatedResponse } from '../types.js';

/**
 * GET /api/v1/orders
 * Получить список заказов текущего клиента (пагинированный)
 */
export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const status = req.query.status as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    // Build where clause
    const where: any = {
      clientId,
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const skip = (page - 1) * pageSize;

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const response: PaginatedResponse<any> = {
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        publicId: order.publicId,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.items?.length || 0,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/orders/:orderId
 * Получить детали заказа
 */
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    // Check authorization: only client who owns the order or admins can view
    if (order.clientId !== clientId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: order.id,
        publicId: order.publicId,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        items: order.items?.map((item) => ({
          id: item.id,
          fabricId: item.fabricId,
          color: item.color,
          requestedMeters: item.requestedMeters.toString(),
          fulfilledMeters: item.fulfilledMeters?.toString(),
          unitPricePerMeter: item.unitPricePerMeter.toString(),
          rolls: item.rolls,
          totalPrice: item.totalPrice.toString(),
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/orders/stats
 * Получить статистику заказов текущего клиента
 */
export const getOrderStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { clientId },
    });

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
      processingOrders: orders.filter((o) => o.status === 'PROCESSING').length,
      shippedOrders: orders.filter((o) => o.status === 'SHIPPED').length,
      deliveredOrders: orders.filter((o) => o.status === 'DELIVERED').length,
      totalSpent: orders.reduce((sum, o) => sum + parseFloat(o.totalAmount.toString()), 0),
      averageOrderValue: orders.length > 0
        ? orders.reduce((sum, o) => sum + parseFloat(o.totalAmount.toString()), 0) / orders.length
        : 0,
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/orders/:orderId/cancel
 * Отменить заказ (только если статус PENDING или CONFIRMED)
 */
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const clientId = req.headers['x-client-id'] as string;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Client ID is required',
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found',
      });
      return;
    }

    if (order.clientId !== clientId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      res.status(400).json({
        success: false,
        error: 'Only pending or confirmed orders can be cancelled',
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: updatedOrder.id,
        publicId: updatedOrder.publicId,
        status: updatedOrder.status,
      },
      message: 'Order cancelled successfully',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

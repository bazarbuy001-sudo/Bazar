/**
 * Cabinet Controller v2
 * Личный кабинет клиента - заказы и профиль
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/v2/cabinet/profile
 * Получить профиль клиента
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // clientId должен быть в req.user (из middleware аутентификации)
    const clientId = (req as any).user?.clientId;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      res.status(404).json({
        success: false,
        error: 'Client not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: client.id,
        publicId: client.publicId,
        name: client.name,
        email: client.email,
        phone: client.phone,
        city: client.city,
        inn: client.inn,
        isActive: client.isActive,
        createdAt: client.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch profile'
    });
  }
};

/**
 * PUT /api/v2/cabinet/profile
 * Обновить профиль клиента
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.clientId;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const { name, phone, city } = req.body;

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        city: city || undefined
      }
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        city: client.city
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
};

/**
 * GET /api/v2/cabinet/orders
 * Получить все заказы клиента
 */
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.clientId;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const { status, page = 1, limit = 10 } = req.query;

    const where: any = { clientId };
    if (status) where.status = status.toString().toUpperCase();

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            // Может быть нужна информация о товаре
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
 * GET /api/v2/cabinet/orders/:orderId
 * Получить детали заказа
 */
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.clientId;
    const { orderId } = req.params;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        client: true
      }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Order not found'
      });
      return;
    }

    // Проверить что заказ принадлежит клиенту
    if (order.clientId !== clientId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
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
 * POST /api/v2/cabinet/orders/:orderId/cancel
 * Отменить заказ (если возможно)
 */
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.clientId;
    const { orderId } = req.params;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
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

    if (order.clientId !== clientId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    // Нельзя отменить если уже отправлен/доставлен
    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      res.status(400).json({
        success: false,
        error: `Cannot cancel order with status ${order.status}`
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' }
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: updatedOrder
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel order'
    });
  }
};

/**
 * GET /api/v2/cabinet/chats
 * Получить все чаты клиента
 */
export const getChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.clientId;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    const chats = await prisma.chat.findMany({
      where: { clientId },
      include: {
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: chats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch chats'
    });
  }
};

/**
 * GET /api/v2/cabinet/chats/:chatId/messages
 * Получить сообщения из чата
 */
export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.clientId;
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    // Проверить что чат принадлежит клиенту
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    });

    if (!chat || chat.clientId !== clientId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'asc' }
    });

    const total = await prisma.message.count({ where: { chatId } });

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch messages'
    });
  }
};

/**
 * POST /api/v2/cabinet/chats/:chatId/messages
 * Отправить сообщение в чат
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.clientId;
    const { chatId } = req.params;
    const { content } = req.body;

    if (!clientId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }

    if (!content) {
      res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
      return;
    }

    // Проверить что чат принадлежит клиенту
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    });

    if (!chat || chat.clientId !== clientId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: clientId,
        senderType: 'CLIENT',
        content
      }
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message'
    });
  }
};

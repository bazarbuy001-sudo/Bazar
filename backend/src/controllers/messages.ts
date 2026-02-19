/**
 * Messages Controller
 * Handles chat messages between clients and admins per order
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const GetMessagesParamsSchema = z.object({
  orderId: z.string().min(1),
});

const PostMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

const MarkReadParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/v1/orders/:orderId/messages
 * Get message history for an order
 */
export const getOrderMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      res.status(401).json({ error: 'Client authentication required' });
      return;
    }

    // Validate params
    const { orderId } = GetMessagesParamsSchema.parse(req.params);

    // First, verify client owns this order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { publicId: orderId },
        ],
        clientId: clientId, // Security: only own orders
      },
      select: { id: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Get messages for this order
    const messages = await prisma.message.findMany({
      where: {
        orderId: order.id,
      },
      select: {
        id: true,
        senderType: true,
        senderId: true,
        content: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
      return;
    }

    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/v1/orders/:orderId/messages
 * Send a message from client to admin
 */
export const postOrderMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      res.status(401).json({ error: 'Client authentication required' });
      return;
    }

    // Validate params and body
    const { orderId } = GetMessagesParamsSchema.parse(req.params);
    const { content } = PostMessageSchema.parse(req.body);

    // First, verify client owns this order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { publicId: orderId },
        ],
        clientId: clientId, // Security: only own orders
      },
      select: { id: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        orderId: order.id,
        senderType: 'CLIENT',
        senderId: clientId,
        content: content,
      },
      select: {
        id: true,
        senderType: true,
        senderId: true,
        content: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
      return;
    }

    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/v1/messages/:id/read
 * Mark message as read
 */
export const markMessageAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      res.status(401).json({ error: 'Client authentication required' });
      return;
    }

    // Validate params
    const { id } = MarkReadParamsSchema.parse(req.params);

    // Find message and verify it belongs to client's order
    const message = await prisma.message.findFirst({
      where: {
        id: id,
        order: {
          clientId: clientId, // Security: only client's messages
        },
      },
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Update message
    const updatedMessage = await prisma.message.update({
      where: { id: id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    });

    res.json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
      return;
    }

    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/messages/unread-count
 * Get count of unread messages for client
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      res.status(401).json({ error: 'Client authentication required' });
      return;
    }

    // Count unread messages in client's orders
    const unreadCount = await prisma.message.count({
      where: {
        isRead: false,
        senderType: {
          not: 'CLIENT', // Don't count own messages
        },
        order: {
          clientId: clientId,
        },
      },
    });

    res.json({
      success: true,
      data: {
        unreadCount: unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create system message (utility function)
 * Used by other parts of the system
 */
export const createSystemMessage = async (orderId: string, content: string) => {
  try {
    const message = await prisma.message.create({
      data: {
        orderId: orderId,
        senderType: 'SYSTEM',
        senderId: null, // System messages have no sender
        content: content,
      },
    });
    
    return message;
  } catch (error) {
    console.error('Error creating system message:', error);
    throw error;
  }
};
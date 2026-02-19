/**
 * Orders Controller
 * Handles order listing and details for clients
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const GetOrderParamsSchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/v1/orders
 * Get list of orders for the authenticated client
 */
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      res.status(401).json({ error: 'Client authentication required' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        clientId: clientId,
      },
      select: {
        id: true,
        publicId: true,
        status: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            items: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/orders/:id
 * Get order details with items
 */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = req.user?.clientId;
    if (!clientId) {
      res.status(401).json({ error: 'Client authentication required' });
      return;
    }

    // Validate params
    const { id } = GetOrderParamsSchema.parse(req.params);

    // Find order - could be by UUID or publicId
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: id },
          { publicId: id },
        ],
        clientId: clientId, // Security: only own orders
      },
      include: {
        items: {
          select: {
            id: true,
            fabricId: true,
            color: true,
            requestedMeters: true,
            fulfilledMeters: true,
            unitPricePerMeter: true,
            rolls: true,
            totalPrice: true,
            createdAt: true,
          },
        },
        client: {
          select: {
            id: true,
            publicId: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation error', 
        details: error.issues 
      });
      return;
    }

    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
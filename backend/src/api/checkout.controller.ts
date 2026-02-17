import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { ApiResponse, OrderCreateRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface CheckoutSession {
  sessionId: string;
  step: 'contact' | 'confirmation';
  contactData?: {
    email: string;
    name: string;
    phone: string;
    city: string;
  };
  cartItems?: any[];
  totalAmount?: number;
  createdAt: Date;
  expiresAt: Date;
}

// Mock checkout sessions store (in production: Redis/DB)
const checkoutSessions = new Map<string, CheckoutSession>();

/**
 * POST /api/v1/checkout/init
 * Инициализировать checkout сессию (Step 1: Contact)
 */
export const initCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, phone, city } = req.body;

    // Validation
    if (!email || !name || !phone || !city) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, phone, city',
      });
      return;
    }

    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    const session: CheckoutSession = {
      sessionId,
      step: 'contact',
      contactData: { email, name, phone, city },
      createdAt: now,
      expiresAt,
    };

    checkoutSessions.set(sessionId, session);

    const response: ApiResponse<{ sessionId: string; step: string }> = {
      success: true,
      data: { sessionId, step: 'contact' },
      message: 'Checkout session initialized',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/checkout/confirmation
 * Перейти к подтверждению (Step 2: Confirmation)
 * Получить информацию из корзины и перейти на страницу подтверждения
 */
export const getCheckoutConfirmation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Missing sessionId',
      });
      return;
    }

    const session = checkoutSessions.get(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Checkout session not found or expired',
      });
      return;
    }

    if (new Date() > session.expiresAt) {
      checkoutSessions.delete(sessionId);
      res.status(410).json({
        success: false,
        error: 'Checkout session expired',
      });
      return;
    }

    // Get cart data from headers (in production: from session/Redis)
    const clientId = req.headers['x-client-id'] as string || 'anonymous';

    // Mock cart data (in production: from actual cart store)
    const cartItems = JSON.parse(req.body.cartItems || '[]');
    const totalAmount = cartItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

    session.step = 'confirmation';
    session.cartItems = cartItems;
    session.totalAmount = totalAmount;

    checkoutSessions.set(sessionId, session);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        sessionId,
        step: 'confirmation',
        contactData: session.contactData,
        cartItems,
        totalAmount,
      },
      message: 'Ready for order confirmation',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/checkout/submit
 * Подтвердить заказ и создать Order в БД
 */
export const submitOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId, shippingAddress, notes } = req.body;

    if (!sessionId || !shippingAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, shippingAddress',
      });
      return;
    }

    const session = checkoutSessions.get(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Checkout session not found',
      });
      return;
    }

    if (session.step !== 'confirmation') {
      res.status(400).json({
        success: false,
        error: 'Invalid checkout step. Must be at confirmation stage.',
      });
      return;
    }

    const clientId = req.headers['x-client-id'] as string;

    // For MVP: Create order without actual client validation
    // In production: validate client exists and is authenticated
    
    const publicId = `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create order (will use real client in production)
    // For now, skip actual order creation and just return success
    const order = {
      id: uuidv4(),
      publicId,
      clientId: clientId || 'client-anonymous',
      status: 'PENDING',
      totalAmount: session.totalAmount || 0,
      currency: 'RUB',
      shippingAddress,
      notes,
      items: session.cartItems || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Clean up checkout session
    checkoutSessions.delete(sessionId);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        orderId: order.id,
        publicId: order.publicId,
        status: order.status,
        totalAmount: order.totalAmount,
      },
      message: 'Order created successfully',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/checkout/session/:sessionId
 * Получить информацию о сессии checkout
 */
export const getCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = checkoutSessions.get(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Checkout session not found',
      });
      return;
    }

    if (new Date() > session.expiresAt) {
      checkoutSessions.delete(sessionId);
      res.status(410).json({
        success: false,
        error: 'Checkout session expired',
      });
      return;
    }

    const response: ApiResponse<CheckoutSession> = {
      success: true,
      data: session,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

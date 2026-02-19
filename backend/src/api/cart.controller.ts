import { Request, Response, NextFunction } from 'express';
import { Cart, CartItem, Product, ApiResponse } from '../types.js';

// Mock cart storage (in-memory for MVP, will be replaced with Redis/DB)
const cartsStore = new Map<string, Cart>();

/**
 * GET /api/v1/cart
 * Получить содержимое корзины пользователя
 */
export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In MVP: get from session/cookies, in production: from JWT token
    const clientId = req.headers['x-client-id'] as string || 'anonymous';

    const cart = cartsStore.get(clientId) || {
      id: `cart-${clientId}`,
      sessionId: clientId,
      items: [],
      subtotal: 0,
      total: 0,
      totalAmount: 0,
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response: ApiResponse<Cart> = {
      success: true,
      data: cart,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cart
 * Добавить товар в корзину или обновить количество
 */
export const addToCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, color, meters, pricePerMeter } = req.body as {
      productId: string;
      color: string;
      meters: number;
      pricePerMeter: number;
    };

    // Validation
    if (!productId || !color || !meters || !pricePerMeter) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: productId, color, meters, pricePerMeter',
      });
      return;
    }

    if (meters <= 0) {
      res.status(400).json({
        success: false,
        error: 'Meters must be greater than 0',
      });
      return;
    }

    const clientId = req.headers['x-client-id'] as string || 'anonymous';

    const cart = cartsStore.get(clientId) || {
      id: `cart-${clientId}`,
      sessionId: clientId,
      items: [],
      subtotal: 0,
      total: 0,
      totalAmount: 0,
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Check if item already exists
    const existingItem = cart.items.find(
      (item) => item.fabricId === productId && item.color === color
    );

    if (existingItem) {
      // Update quantity
      existingItem.meters += meters;
      existingItem.totalPrice = existingItem.meters * pricePerMeter;
    } else {
      // Add new item
      const newItem: CartItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: productId,
        fabricId: productId,
        product: {} as Product, // Will be populated from DB in real implementation
        color,
        meters,
        rolls: Math.ceil(meters / 100), // Assuming 100 meters per roll
        pricePerMeter,
        total: meters * pricePerMeter,
        totalPrice: meters * pricePerMeter,
      };
      cart.items.push(newItem);
    }

    // Recalculate totals
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.totalPrice || item.total), 0);
    cart.itemCount = cart.items.length;

    cartsStore.set(clientId, cart);

    const response: ApiResponse<Cart> = {
      success: true,
      data: cart,
      message: 'Item added to cart',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/cart/:itemId
 * Обновить количество товара в корзине
 */
export const updateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { meters } = req.body as { meters: number };
    const { productId, color } = req.query;

    if (!productId || !color) {
      res.status(400).json({
        success: false,
        error: 'Missing query params: productId, color',
      });
      return;
    }

    if (meters <= 0) {
      res.status(400).json({
        success: false,
        error: 'Meters must be greater than 0',
      });
      return;
    }

    const clientId = req.headers['x-client-id'] as string || 'anonymous';
    const cart = cartsStore.get(clientId);

    if (!cart) {
      res.status(404).json({
        success: false,
        error: 'Cart not found',
      });
      return;
    }

    const item = cart.items.find(
      (i) => i.fabricId === productId && i.color === color
    );

    if (!item) {
      res.status(404).json({
        success: false,
        error: 'Item not found in cart',
      });
      return;
    }

    item.meters = meters;
    item.totalPrice = meters * item.pricePerMeter;
    item.total = item.totalPrice;  // Синхронизация с основным полем

    // Recalculate totals
    cart.totalAmount = cart.items.reduce((sum, i) => sum + (i.totalPrice || i.total), 0);

    cartsStore.set(clientId, cart);

    const response: ApiResponse<Cart> = {
      success: true,
      data: cart,
      message: 'Cart item updated',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cart/:itemId
 * Удалить товар из корзины
 */
export const removeFromCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, color } = req.query;

    if (!productId || !color) {
      res.status(400).json({
        success: false,
        error: 'Missing query params: productId, color',
      });
      return;
    }

    const clientId = req.headers['x-client-id'] as string || 'anonymous';
    const cart = cartsStore.get(clientId);

    if (!cart) {
      res.status(404).json({
        success: false,
        error: 'Cart not found',
      });
      return;
    }

    cart.items = cart.items.filter(
      (item) => !(item.fabricId === productId && item.color === color)
    );

    // Recalculate totals
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.totalPrice || item.total), 0);
    cart.itemCount = cart.items.length;

    if (cart.items.length === 0) {
      cartsStore.delete(clientId);
    } else {
      cartsStore.set(clientId, cart);
    }

    const response: ApiResponse<Cart> = {
      success: true,
      data: cart,
      message: 'Item removed from cart',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cart
 * Очистить корзину
 */
export const clearCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.headers['x-client-id'] as string || 'anonymous';
    cartsStore.delete(clientId);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Cart cleared',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

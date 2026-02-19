import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { ApiResponse } from '../types.js';

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

const AddToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
});

const CartItemIdSchema = z.object({
  id: z.string().uuid('Invalid cart item ID'),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Получить или создать корзину для клиента/гостя
 */
async function getOrCreateCart(clientId: string | null, sessionId?: string) {
  if (clientId) {
    // Авторизованный пользователь - ищем по clientId
    let cart = await prisma.cart.findUnique({
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
                  select: { imageUrl: true }
                }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      // Создаем новую корзину для пользователя
      cart = await prisma.cart.create({
        data: {
          clientId,
          sessionId: sessionId || `client-${clientId}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
        },
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
                    select: { imageUrl: true }
                  }
                }
              }
            }
          }
        }
      });
    }

    return cart;
  } else if (sessionId) {
    // Гостевая корзина - ищем по sessionId
    let cart = await prisma.cart.findFirst({
      where: { 
        sessionId,
        clientId: null // Убеждаемся что это гостевая корзина
      },
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
                  select: { imageUrl: true }
                }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      // Создаем новую гостевую корзину
      cart = await prisma.cart.create({
        data: {
          sessionId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
        },
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
                    select: { imageUrl: true }
                  }
                }
              }
            }
          }
        }
      });
    }

    return cart;
  } else {
    throw new Error('Either clientId or sessionId must be provided');
  }
}

/**
 * Подсчет итогов корзины
 */
function calculateCartTotals(cartItems: Array<{ priceAtAdd: any; quantity: number }>) {
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (Number(item.priceAtAdd) * item.quantity);
  }, 0);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    total: Number(subtotal.toFixed(2)),
    itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
  };
}

/**
 * Извлечь clientId и sessionId из запроса
 */
function extractClientInfo(req: Request) {
  const clientId = (req as any).user?.id || null;
  const sessionId = req.headers['x-session-id'] as string;
  
  return { clientId, sessionId };
}

// ============================================
// API CONTROLLERS
// ============================================

/**
 * GET /api/v1/cart
 * Получить содержимое корзины
 */
export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { clientId, sessionId } = extractClientInfo(req);

    if (!clientId && !sessionId) {
      res.status(400).json({
        success: false,
        error: 'Client authentication or session ID required'
      });
      return;
    }

    const cart = await getOrCreateCart(clientId, sessionId);
    const totals = calculateCartTotals(cart.items);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: cart.id,
        items: cart.items.map(item => ({
          id: item.id,
          productId: item.productId,
          product: {
            name: item.product.name,
            price: item.product.price,
            imageUrl: item.product.images[0]?.imageUrl || null,
            available: Number(item.product.warehouseAvailability) > 0
          },
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
          total: Number((Number(item.priceAtAdd) * item.quantity).toFixed(2)),
          createdAt: item.createdAt
        })),
        ...totals,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cart/items
 * Добавить товар в корзину
 */
export const addToCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Валидация входных данных
    const result = AddToCartSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: result.error.issues
      });
      return;
    }

    const { productId, quantity } = result.data;
    const { clientId, sessionId } = extractClientInfo(req);

    if (!clientId && !sessionId) {
      res.status(400).json({
        success: false,
        error: 'Client authentication or session ID required'
      });
      return;
    }

    // Проверяем существование и наличие товара
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        warehouseAvailability: true,
        
      }
    });

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    if (Number(product.warehouseAvailability) < quantity) {
      res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        available: Number(product.warehouseAvailability)
      });
      return;
    }

    // Получаем корзину
    const cart = await getOrCreateCart(clientId, sessionId);

    // Проверяем есть ли уже этот товар в корзине
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId
        }
      }
    });

    let cartItem;

    if (existingItem) {
      // Обновляем количество
      const newQuantity = existingItem.quantity + quantity;
      
      if (Number(product.warehouseAvailability) < newQuantity) {
        res.status(400).json({
          success: false,
          error: 'Insufficient stock for updated quantity',
          available: Number(product.warehouseAvailability),
          currentInCart: existingItem.quantity
        });
        return;
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            select: {
              name: true,
              images: {
                where: { isMain: true },
                select: { imageUrl: true }
              }
            }
          }
        }
      });
    } else {
      // Создаем новый элемент корзины
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
          priceAtAdd: product.price // Фиксируем цену на момент добавления
        },
        include: {
          product: {
            select: {
              name: true,
              images: {
                where: { isMain: true },
                select: { imageUrl: true }
              }
            }
          }
        }
      });
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: cartItem.id,
        productId: cartItem.productId,
        product: {
          name: cartItem.product.name,
          imageUrl: cartItem.product.images[0]?.imageUrl || null
        },
        quantity: cartItem.quantity,
        priceAtAdd: cartItem.priceAtAdd,
        total: Number((Number(cartItem.priceAtAdd) * cartItem.quantity).toFixed(2))
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/cart/items/:id
 * Обновить количество товара в корзине
 */
export const updateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Валидация ID
    const idResult = CartItemIdSchema.safeParse({ id: req.params.id });
    if (!idResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid cart item ID'
      });
      return;
    }

    // Валидация данных
    const bodyResult = UpdateCartItemSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: bodyResult.error.issues
      });
      return;
    }

    const { id } = idResult.data;
    const { quantity } = bodyResult.data;
    const { clientId, sessionId } = extractClientInfo(req);

    // Проверяем что элемент корзины принадлежит текущему пользователю/сессии
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        product: {
          select: {
            warehouseAvailability: true,
            name: true,
            images: {
              where: { isMain: true },
              select: { imageUrl: true }
            }
          }
        }
      }
    });

    if (!cartItem) {
      res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
      return;
    }

    // Проверяем права доступа
    const hasAccess = clientId ? 
      cartItem.cart.clientId === clientId :
      cartItem.cart.sessionId === sessionId && !cartItem.cart.clientId;

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    // Проверяем наличие товара
    if (Number(cartItem.product.warehouseAvailability) < quantity) {
      res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        available: Number(cartItem.product.warehouseAvailability)
      });
      return;
    }

    // Обновляем количество
    const updatedItem = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          select: {
            name: true,
            images: {
              where: { isMain: true },
              select: { imageUrl: true }
            }
          }
        }
      }
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: updatedItem.id,
        productId: updatedItem.productId,
        product: {
          name: updatedItem.product.name,
          imageUrl: updatedItem.product.images[0]?.imageUrl || null
        },
        quantity: updatedItem.quantity,
        priceAtAdd: updatedItem.priceAtAdd,
        total: Number((Number(updatedItem.priceAtAdd) * updatedItem.quantity).toFixed(2))
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cart/items/:id
 * Удалить товар из корзины
 */
export const removeFromCart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Валидация ID
    const result = CartItemIdSchema.safeParse({ id: req.params.id });
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid cart item ID'
      });
      return;
    }

    const { id } = result.data;
    const { clientId, sessionId } = extractClientInfo(req);

    // Проверяем что элемент корзины принадлежит текущему пользователю/сессии
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true }
    });

    if (!cartItem) {
      res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
      return;
    }

    // Проверяем права доступа
    const hasAccess = clientId ? 
      cartItem.cart.clientId === clientId :
      cartItem.cart.sessionId === sessionId && !cartItem.cart.clientId;

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    // Удаляем элемент
    await prisma.cartItem.delete({
      where: { id }
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        message: 'Item removed from cart',
        removedItemId: id
      }
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
    const { clientId, sessionId } = extractClientInfo(req);

    if (!clientId && !sessionId) {
      res.status(400).json({
        success: false,
        error: 'Client authentication or session ID required'
      });
      return;
    }

    // Находим корзину
    const cart = await prisma.cart.findFirst({
      where: clientId ? 
        { clientId } : 
        { sessionId, clientId: null }
    });

    if (!cart) {
      res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
      return;
    }

    // Удаляем все элементы корзины
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        message: 'Cart cleared successfully',
        cartId: cart.id
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};
/**
 * Cart API Controller v1
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

const AddItemSchema = z.object({
  product_variant_id: z.number().int().min(1),
  quantity: z.number().min(0.1).max(1000),
});

const UpdateQuantitySchema = z.object({
  quantity: z.number().min(0.1).max(1000),
});

const PromoCodeSchema = z.object({
  code: z.string().min(1).max(50),
});

const MergeCartSchema = z.object({
  sessionId: z.string().min(1).max(100),
});

const CheckoutSchema = z.object({
  comment: z.string().optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractClientId(req: Request): string | null {
  // Try X-Client-Id header first (for compatibility)
  const headerClientId = req.headers['x-client-id'] as string;
  if (headerClientId) return headerClientId;

  // Try JWT token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return decoded.id || null;
    } catch (error) {
      return null;
    }
  }

  return null;
}

async function findOrCreateCart(clientId: string | null, sessionId: string | null) {
  let cart;

  if (clientId) {
    // Залогиненный пользователь
    cart = await prisma.cart.findFirst({
      where: { clientId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        promoCode: {
          include: { discount: true },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { clientId },
        include: {
          items: {
            include: {
              productVariant: {
                include: { product: true },
              },
            },
          },
          promoCode: {
            include: { discount: true },
          },
        },
      });
    }
  } else if (sessionId) {
    // Гостевая корзина
    cart = await prisma.cart.findFirst({
      where: { sessionId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        promoCode: {
          include: { discount: true },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { 
          sessionId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
        include: {
          items: {
            include: {
              productVariant: {
                include: { product: true },
              },
            },
          },
          promoCode: {
            include: { discount: true },
          },
        },
      });
    }
  } else {
    throw new Error('Either clientId or sessionId required');
  }

  return cart;
}

async function recalculateCart(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
  });

  const itemsCount = items.length;
  const subtotal = items.reduce((sum, item) => 
    sum + (Number(item.quantity) * Number(item.pricePerUnit)), 0);

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      promoCode: {
        include: { discount: true },
      },
    },
  });

  let discountAmount = 0;
  if (cart?.promoCode?.discount) {
    const discount = cart.promoCode.discount;
    if (discount.type === 'PERCENT') {
      discountAmount = subtotal * (Number(discount.value) / 100);
    } else if (discount.type === 'FIXED_AMOUNT') {
      discountAmount = Number(discount.value);
    }
    
    // Apply maximum limit if discount exceeds order total
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const total = subtotal - discountAmount;

  await prisma.cart.update({
    where: { id: cartId },
    data: {
      itemsCount,
      subtotal: new Prisma.Decimal(subtotal),
      discountAmount: new Prisma.Decimal(discountAmount),
      total: new Prisma.Decimal(total),
    },
  });
}

// ============================================
// API HANDLERS
// ============================================

/**
 * GET /api/v1/cart
 */
export const getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = extractClientId(req);
    const sessionId = req.headers['x-session-id'] as string || null;

    if (!clientId && !sessionId) {
      res.status(400).json({
        status: 'error',
        message: 'Either Authorization header or X-Session-Id header required',
      });
      return;
    }

    const cart = await findOrCreateCart(clientId, sessionId);

    // Check for price changes and stock
    const updatedItems = cart.items.map(item => {
      const currentPrice = Number(item.productVariant.product.price);
      const snapshotPrice = Number(item.pricePerUnit);
      const priceChanged = Math.abs(currentPrice - snapshotPrice) > 0.01;
      
      return {
        ...item,
        priceChanged,
        outOfStock: !item.productVariant.inStock,
        unavailable: !item.productVariant.isActive,
      };
    });

    const response = {
      status: 'success',
      data: {
        cart: {
          id: cart.id,
          itemsCount: cart.itemsCount,
          subtotal: Number(cart.subtotal),
          discountAmount: Number(cart.discountAmount),
          total: Number(cart.total),
          currency: cart.currency,
          promoCode: cart.promoCode ? {
            code: cart.promoCode.code,
            discount: {
              type: cart.promoCode.discount.type,
              value: Number(cart.promoCode.discount.value),
              name: cart.promoCode.discount.name,
            },
          } : null,
          items: updatedItems.map(item => ({
            id: item.id,
            productId: item.productId,
            productVariantId: item.productVariantId,
            quantity: Number(item.quantity),
            pricePerUnit: Number(item.pricePerUnit),
            productName: item.productName,
            variantName: item.variantName,
            imageUrl: item.imageUrl,
            priceChanged: item.priceChanged,
            outOfStock: item.outOfStock,
            unavailable: item.unavailable,
            totalPrice: Number(item.quantity) * Number(item.pricePerUnit),
          })),
          createdAt: cart.createdAt.toISOString(),
          updatedAt: cart.updatedAt.toISOString(),
        },
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cart/items
 */
export const addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = extractClientId(req);
    const sessionId = req.headers['x-session-id'] as string || null;
    
    const { product_variant_id, quantity } = AddItemSchema.parse(req.body);

    // Get product variant
    const variant = await prisma.productVariant.findFirst({
      where: { 
        id: product_variant_id,
        isActive: true,
        inStock: true,
      },
      include: { product: true },
    });

    if (!variant) {
      res.status(404).json({
        status: 'error',
        message: 'Product variant not found or not available',
      });
      return;
    }

    // Validate quantity
    const minOrderQty = Number(variant.product.minOrderQty);
    const stepQty = Number(variant.product.stepQty);

    if (quantity < minOrderQty) {
      res.status(400).json({
        status: 'error',
        message: `Minimum order quantity is ${minOrderQty}`,
      });
      return;
    }

    const remainder = (quantity - minOrderQty) / stepQty;
    if (Math.abs(remainder - Math.round(remainder)) > 0.001) {
      res.status(400).json({
        status: 'error',
        message: `Quantity must be multiple of ${stepQty}`,
      });
      return;
    }

    const cart = await findOrCreateCart(clientId, sessionId);

    // Check if variant already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productVariantId: product_variant_id,
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = Number(existingItem.quantity) + quantity;
      
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: new Prisma.Decimal(newQuantity),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new item with snapshot
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productVariantId: product_variant_id,
          productId: variant.productId,
          quantity: new Prisma.Decimal(quantity),
          pricePerUnit: variant.product.price,
          currency: 'RUB',
          productName: variant.product.name,
          variantName: variant.colorName,
          imageUrl: variant.product.mainImage,
        },
      });
    }

    await recalculateCart(cart.id);

    res.json({
      status: 'success',
      message: 'Item added to cart successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.issues,
      });
      return;
    }
    next(error);
  }
};

/**
 * PATCH /api/v1/cart/items/:id
 */
export const updateQuantity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const itemId = req.params.id;
    const { quantity } = UpdateQuantitySchema.parse(req.body);

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        productVariant: {
          include: { product: true },
        },
      },
    });

    if (!item) {
      res.status(404).json({
        status: 'error',
        message: 'Cart item not found',
      });
      return;
    }

    // Validate quantity
    const minOrderQty = Number(item.productVariant.product.minOrderQty);
    const stepQty = Number(item.productVariant.product.stepQty);

    const remainder = (quantity - minOrderQty) / stepQty;
    if (quantity < minOrderQty || Math.abs(remainder - Math.round(remainder)) > 0.001) {
      res.status(400).json({
        status: 'error',
        message: `Invalid quantity. Min: ${minOrderQty}, Step: ${stepQty}`,
      });
      return;
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: new Prisma.Decimal(quantity),
        updatedAt: new Date(),
      },
    });

    await recalculateCart(item.cartId);

    res.json({
      status: 'success',
      message: 'Quantity updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.issues,
      });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/v1/cart/items/:id
 */
export const removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const itemId = req.params.id;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      res.status(404).json({
        status: 'error',
        message: 'Cart item not found',
      });
      return;
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    await recalculateCart(item.cartId);

    res.json({
      status: 'success',
      message: 'Item removed from cart successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cart
 */
export const clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = extractClientId(req);
    const sessionId = req.headers['x-session-id'] as string || null;

    const cart = await findOrCreateCart(clientId, sessionId);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        itemsCount: 0,
        subtotal: 0,
        discountAmount: 0,
        total: 0,
        promoCodeId: null,
      },
    });

    res.json({
      status: 'success',
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cart/promo-code
 */
export const applyPromoCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = extractClientId(req);
    const { code } = PromoCodeSchema.parse(req.body);

    if (!clientId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required for promo codes',
      });
      return;
    }

    const promoCode = await prisma.promoCode.findFirst({
      where: {
        code,
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
      include: { discount: true },
    });

    if (!promoCode) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid or expired promo code',
      });
      return;
    }

    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      res.status(400).json({
        status: 'error',
        message: 'Promo code usage limit reached',
      });
      return;
    }

    const cart = await findOrCreateCart(clientId, null);

    // Check minimum order amount
    if (promoCode.discount.minOrderAmount && Number(cart.subtotal) < Number(promoCode.discount.minOrderAmount)) {
      res.status(400).json({
        status: 'error',
        message: `Minimum order amount: ${promoCode.discount.minOrderAmount} RUB`,
      });
      return;
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: promoCode.id },
    });

    await recalculateCart(cart.id);

    res.json({
      status: 'success',
      message: 'Promo code applied successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.issues,
      });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/v1/cart/promo-code
 */
export const removePromoCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = extractClientId(req);

    if (!clientId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const cart = await findOrCreateCart(clientId, null);

    await prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: null },
    });

    await recalculateCart(cart.id);

    res.json({
      status: 'success',
      message: 'Promo code removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cart/merge
 */
export const mergeCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = extractClientId(req);
    const { sessionId } = MergeCartSchema.parse(req.body);

    if (!clientId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const guestCart = await prisma.cart.findFirst({
      where: { sessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      res.json({
        status: 'success',
        message: 'No guest cart to merge',
      });
      return;
    }

    const userCart = await findOrCreateCart(clientId, null);

    // Merge items
    for (const guestItem of guestCart.items) {
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productVariantId: guestItem.productVariantId,
        },
      });

      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: new Prisma.Decimal(
              Number(existingItem.quantity) + Number(guestItem.quantity)
            ),
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productVariantId: guestItem.productVariantId,
            productId: guestItem.productId,
            quantity: guestItem.quantity,
            pricePerUnit: guestItem.pricePerUnit,
            currency: guestItem.currency,
            productName: guestItem.productName,
            variantName: guestItem.variantName,
            imageUrl: guestItem.imageUrl,
          },
        });
      }
    }

    // Delete guest cart
    await prisma.cart.delete({
      where: { id: guestCart.id },
    });

    await recalculateCart(userCart.id);

    res.json({
      status: 'success',
      message: 'Guest cart merged successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.issues,
      });
      return;
    }
    next(error);
  }
};

/**
 * POST /api/v1/cart/checkout
 */
export const checkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = extractClientId(req);
    const { comment } = CheckoutSchema.parse(req.body);

    if (!clientId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required for checkout',
      });
      return;
    }

    const cart = await prisma.cart.findFirst({
      where: { clientId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        promoCode: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Cart is empty',
      });
      return;
    }

    // Create order in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate order public ID
      const orderCount = await tx.order.count();
      const publicId = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, '0')}`;

      // Create order
      const order = await tx.order.create({
        data: {
          publicId,
          clientId,
          status: 'pending',
          totalAmount: cart.total,
          currency: cart.currency,
          notes: comment || null,
        },
      });

      // Create order items
      for (const item of cart.items) {
        const rollLength = Number(item.productVariant.product.rollLength) || 100;
        const requestedMeters = Number(item.quantity);
        const rolls = Math.ceil(requestedMeters / rollLength);

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            fabricId: item.productId,
            color: item.variantName || 'Default',
            requestedMeters: new Prisma.Decimal(requestedMeters),
            fulfilledMeters: new Prisma.Decimal(0),
            rolls,
            unitPricePerMeter: item.pricePerUnit,
            totalPrice: new Prisma.Decimal(
              Number(item.quantity) * Number(item.pricePerUnit)
            ),
          },
        });
      }

      // Create order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'pending',
          comment: 'Order created from cart',
          changedByAdmin: null,
        },
      });

      // Create system message
      await tx.message.create({
        data: {
          orderId: order.id,
          senderId: clientId,
          senderType: 'SYSTEM',
          content: `Заказ ${publicId} создан. Общая сумма: ${Number(cart.total)} ${cart.currency}`,
        },
      });

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          itemsCount: 0,
          subtotal: 0,
          discountAmount: 0,
          total: 0,
          promoCodeId: null,
        },
      });

      return order;
    });

    res.json({
      status: 'success',
      data: {
        order: {
          id: result.id,
          publicId: result.publicId,
          status: result.status,
          totalAmount: Number(result.totalAmount),
          currency: result.currency,
          createdAt: result.createdAt.toISOString(),
        },
      },
      message: 'Order created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.issues,
      });
      return;
    }
    next(error);
  }
};
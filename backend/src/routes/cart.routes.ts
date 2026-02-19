/**
 * Cart Routes v1
 */

import { Router } from 'express';
import * as cartController from '../api/cart.controller.js';

const router = Router();

// ============================================
// CART ROUTES (mixed auth - guest + client)
// ============================================

// Get cart
router.get('/', cartController.getCart);

// Add item to cart
router.post('/items', cartController.addItem);

// Update item quantity
router.patch('/items/:id', cartController.updateQuantity);

// Remove item from cart
router.delete('/items/:id', cartController.removeItem);

// Clear cart
router.delete('/', cartController.clearCart);

// Apply promo code (auth required)
router.post('/promo-code', cartController.applyPromoCode);

// Remove promo code (auth required)
router.delete('/promo-code', cartController.removePromoCode);

// Merge guest cart (auth required)
router.post('/merge', cartController.mergeCart);

// Checkout (auth required)
router.post('/checkout', cartController.checkout);

export default router;
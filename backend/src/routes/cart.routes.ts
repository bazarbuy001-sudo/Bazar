import { Router } from 'express';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
} from '../api/cart.controller.js';

const router = Router();

// ============================================
// CART ROUTES - /api/v1/cart
// ============================================

// GET /api/v1/cart - получить содержимое корзины
router.get('/cart', getCart);

// POST /api/v1/cart - добавить товар в корзину
router.post('/cart', addToCart);

// PUT /api/v1/cart/:itemId - обновить количество товара
router.put('/cart/item', updateCartItem);

// DELETE /api/v1/cart/item - удалить товар из корзины
router.delete('/cart/item', removeFromCart);

// DELETE /api/v1/cart - очистить корзину
router.delete('/cart', clearCart);

export default router;
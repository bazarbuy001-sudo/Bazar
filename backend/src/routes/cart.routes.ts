import { Router } from 'express';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart 
} from '../api/cart.controller.js';
import { authenticateOptional } from '../middleware/auth.js';

const router = Router();

// ============================================
// CART ROUTES - /api/v1/cart
// ============================================

// Применяем optional auth ко всем роутам корзины
// Это позволяет работать как авторизованным пользователям, так и гостям
router.use(authenticateOptional);

// GET /api/v1/cart - получить содержимое корзины
router.get('/cart', getCart);

// POST /api/v1/cart/items - добавить товар в корзину
router.post('/cart/items', addToCart);

// PUT /api/v1/cart/items/:id - обновить количество товара
router.put('/cart/items/:id', updateCartItem);

// DELETE /api/v1/cart/items/:id - удалить товар из корзины
router.delete('/cart/items/:id', removeFromCart);

// DELETE /api/v1/cart - очистить корзину
router.delete('/cart', clearCart);

export default router;
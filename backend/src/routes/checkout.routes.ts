import { Router } from 'express';
import { initCheckout, submitCheckout } from '../api/checkout.controller.js';
import { authenticateClient } from '../middleware/auth.js';

const router = Router();

// ============================================
// CHECKOUT ROUTES (все требуют авторизации клиента)
// ============================================

/**
 * POST /api/v1/checkout/init
 * Инициализация чекаута - проверка корзины, наличия товаров и цен
 * Требует: Bearer token (client)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "cart": {
 *       "id": "uuid",
 *       "items": [
 *         {
 *           "id": "uuid",
 *           "productId": "uuid",
 *           "product": {
 *             "name": "Ткань название",
 *             "imageUrl": "...",
 *             "currentPrice": 450.00,
 *             "available": 100
 *           },
 *           "quantity": 2,
 *           "priceAtAdd": 450.00,
 *           "currentPrice": 450.00,
 *           "priceChanged": false,
 *           "total": 900.00
 *         }
 *       ],
 *       "subtotal": 900.00,
 *       "total": 900.00
 *     },
 *     "validation": {
 *       "hasStockIssues": false,
 *       "hasPriceChanges": false,
 *       "warnings": [],
 *       "errors": []
 *     }
 *   }
 * }
 */
router.post('/checkout/init', authenticateClient, initCheckout);

/**
 * POST /api/v1/checkout/submit
 * Оформление заказа
 * Требует: Bearer token (client)
 * 
 * Body:
 * {
 *   "shippingAddress": {
 *     "city": "Бишкек",
 *     "street": "ул. Тестовая 1",
 *     "phone": "+996555123456"
 *   },
 *   "comment": "Комментарий к заказу (опционально)"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "orderId": "uuid",
 *     "orderNumber": "ORD-20260219-1234",
 *     "total": 900.00,
 *     "currency": "RUB",
 *     "status": "pending",
 *     "itemsCount": 2,
 *     "createdAt": "2026-02-19T15:53:00Z"
 *   }
 * }
 */
router.post('/checkout/submit', authenticateClient, submitCheckout);

export default router;
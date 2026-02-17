/**
 * Orders Routes v2
 */

import { Router } from 'express';
import * as ordersController from '../api/orders.v2.controller';
import { authenticateClient, authenticateAdmin } from '../middleware/auth';

const router = Router();

// Client routes (требует аутентификации клиента)
router.post('/', authenticateClient, ordersController.createOrder);

// Admin routes (требует аутентификации админа)
router.get('/', authenticateAdmin, ordersController.getAllOrders);
router.get('/stats', authenticateAdmin, ordersController.getOrderStats);
router.get('/:orderId', authenticateAdmin, ordersController.getOrder);
router.put('/:orderId/status', authenticateAdmin, ordersController.updateOrderStatus);

export default router;

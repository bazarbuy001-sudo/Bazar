/**
 * Orders Routes
 * Client order listing and details
 */

import { Router } from 'express';
import { authenticateClient } from '../middleware/auth.js';
import { getOrders, getOrderById } from '../controllers/orders.js';

const router = Router();

// All orders routes require client authentication
router.use(authenticateClient);

/**
 * GET /api/v1/orders
 * Get list of orders for authenticated client
 */
router.get('/', getOrders);

/**
 * GET /api/v1/orders/:id
 * Get order details by ID or publicId
 */
router.get('/:id', getOrderById);

export default router;
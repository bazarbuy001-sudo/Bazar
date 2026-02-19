/**
 * Messages Routes  
 * Chat functionality between clients and admins per order
 */

import { Router } from 'express';
import { authenticateClient } from '../middleware/auth.js';
import { 
  getOrderMessages, 
  postOrderMessage, 
  markMessageAsRead,
  getUnreadCount 
} from '../controllers/messages.js';

const router = Router();

// All messages routes require client authentication
router.use(authenticateClient);

/**
 * GET /api/v1/messages/unread-count
 * Get unread messages count for client (for badge in header)
 */
router.get('/unread-count', getUnreadCount);

/**
 * PUT /api/v1/messages/:id/read
 * Mark message as read
 */
router.put('/:id/read', markMessageAsRead);

/**
 * GET /api/v1/orders/:orderId/messages
 * Get message history for an order
 */
router.get('/orders/:orderId/messages', getOrderMessages);

/**
 * POST /api/v1/orders/:orderId/messages
 * Send message from client to admin
 */
router.post('/orders/:orderId/messages', postOrderMessage);

export default router;
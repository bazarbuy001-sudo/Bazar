import { Router } from 'express';
import * as adminController from '../api/admin.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * ============================================
 * AUTH ROUTES (NO AUTHENTICATION REQUIRED)
 * ============================================
 */

// Login
router.post('/login', adminController.login);

/**
 * ============================================
 * PROTECTED ROUTES (AUTHENTICATION REQUIRED)
 * ============================================
 */

// Apply auth middleware to all routes below
router.use(authMiddleware);

// Logout
router.post('/logout', adminController.logout);

/**
 * ============================================
 * PRODUCTS ROUTES
 * ============================================
 */

router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);
router.get('/products/:id', adminController.getProductById); // NEW: Get single product
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/upload', adminController.uploadProductImages);
router.post('/products/import', adminController.importProducts); // NEW: Import products

/**
 * ============================================
 * ORDERS ROUTES
 * ============================================
 */

router.get('/orders', adminController.getOrders);
router.get('/orders/stats', adminController.getOrderStats); // NEW: Get order stats (MUST be before /:id)
router.get('/orders/:id', adminController.getOrderById); // NEW: Get single order
router.put('/orders/:id', adminController.updateOrder);

/**
 * ============================================
 * CLIENTS ROUTES
 * ============================================
 */

router.get('/clients', adminController.getClients);
router.get('/clients/:id', adminController.getClientById); // NEW: Get client profile
router.put('/clients/:id', adminController.updateClient); // NEW: Update client profile
router.put('/clients/:id/block', adminController.blockClient); // NEW: Block/unblock client
router.get('/clients/:id/orders', adminController.getClientOrders); // NEW: Get client's orders

/**
 * ============================================
 * CHATS ROUTES
 * ============================================
 */

router.get('/chats', adminController.getChats); // NEW: Get all chats
router.get('/chats/:id/messages', adminController.getChatMessages); // NEW: Get chat messages
router.post('/chats/:id/messages', adminController.sendChatMessage); // NEW: Send message

/**
 * ============================================
 * AUTH - ADDITIONAL ROUTES
 * ============================================
 */

router.post('/refresh-token', adminController.refreshToken); // NEW: Refresh JWT token

/**
 * ============================================
 * DASHBOARD ROUTES
 * ============================================
 */

router.get('/dashboard', adminController.getDashboard);

export default router;

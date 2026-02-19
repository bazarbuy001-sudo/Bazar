import { Router } from 'express';
import productsRoutes from './products.routes.js';
import cartRoutes from './cart.routes.js';
import cabinetRoutes from './cabinet.routes.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import ordersRoutes from './orders.routes.js';
import messagesRoutes from './messages.routes.js';
// import autosaveRoutes from './autosave.routes.js'; // Disabled - not compatible with current schema

const router = Router();

// ============================================
// AUTH ROUTES (public)
// ============================================
router.use('/auth', authRoutes);

// ============================================
// PRODUCTS ROUTES (public access)
// ============================================
router.use('/', productsRoutes);

// ============================================
// CART ROUTES (mixed - guest + auth)
// ============================================
router.use('/cart', cartRoutes);

// ============================================
// CABINET ROUTES (client auth required)
// ============================================
router.use('/cabinet', cabinetRoutes);

// ============================================
// ORDERS ROUTES (client auth required)
// ============================================
router.use('/orders', ordersRoutes);

// ============================================
// MESSAGES ROUTES (client auth required)
// ============================================
router.use('/messages', messagesRoutes);

// ============================================
// ADMIN ROUTES (admin auth required)
// ============================================
router.use('/admin', adminRoutes);

// ============================================
// EXPORT
// ============================================

export default router;
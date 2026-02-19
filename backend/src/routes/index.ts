import { Router } from 'express';
import productsRoutes from './products.routes.js';
import cabinetRoutes from './cabinet.routes.js';
import ordersRoutes from './orders.routes.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import autosaveRoutes from './autosave.routes.js';
import cartRoutes from './cart.routes.js';

const router = Router();

// ============================================
// AUTH ROUTES (public)
// ============================================
router.use('/auth', authRoutes);

// ============================================
// AUTOSAVE ROUTES (public - работает со всеми пользователями)
// ============================================
router.use('/', autosaveRoutes);

// ============================================
// PRODUCTS ROUTES (public + admin)
// ============================================
router.use('/', productsRoutes);

// ============================================
// CART ROUTES (public - корзина для всех)
// ============================================
router.use('/', cartRoutes);

// ============================================
// ORDERS ROUTES (client + admin auth)
// ============================================
router.use('/orders', ordersRoutes);

// ============================================
// CABINET ROUTES (client auth required)
// ============================================
router.use('/cabinet', cabinetRoutes);

// ============================================
// ADMIN ROUTES (admin auth required)
// ============================================
router.use('/admin', adminRoutes);

// ============================================
// EXPORT
// ============================================

export default router;

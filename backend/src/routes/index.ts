import { Router } from 'express';
import productsRoutes from './products.routes';
import cabinetRoutes from './cabinet.routes';
import ordersRoutes from './orders.routes';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';

const router = Router();

// ============================================
// AUTH ROUTES (public)
// ============================================
router.use('/auth', authRoutes);

// ============================================
// PRODUCTS ROUTES (public + admin)
// ============================================
router.use('/', productsRoutes);

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

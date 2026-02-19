import { Router } from 'express';
import productsRoutes from './products.routes.js';
import cabinetRoutes from './cabinet.routes.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
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
import { Router } from 'express';
import productsRoutes from './products.routes';
import cabinetRoutes from './cabinet.routes';
import adminRoutes from './admin.routes';

const router = Router();

// ============================================
// V2 PRODUCTS ROUTES (New structure)
// ============================================
router.use('/v2/products', productsRoutes);

// ============================================
// V2 CABINET ROUTES (New structure)
// ============================================
router.use('/v2/cabinet', cabinetRoutes);

// ============================================
// ADMIN ROUTES (Legacy - for backward compatibility)
// ============================================
router.use('/admin', adminRoutes);

// ============================================
// EXPORT
// ============================================

export default router;

/**
 * Products Routes v2
 */

import { Router } from 'express';
import * as productsController from '../api/products.v2.controller.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

// Admin routes (требует аутентификации)
router.post('/admin/products', authenticateAdmin, productsController.createProduct);
router.get('/admin/products', authenticateAdmin, productsController.getAllProducts);
router.get('/admin/products/:id', authenticateAdmin, productsController.getProduct);
router.put('/admin/products/:id', authenticateAdmin, productsController.updateProduct);
router.delete('/admin/products/:id', authenticateAdmin, productsController.deleteProduct);

// Categories (public)
router.get('/categories', productsController.getCategories);

// Public product list (для каталога)
router.get('/products', productsController.getAllProducts);
router.get('/products/:id', productsController.getProduct);

export default router;

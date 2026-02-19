/**
 * Products Routes v1
 */

import { Router } from 'express';
import * as productsController from '../api/products.controller.js';

const router = Router();

// ============================================
// PRODUCTS ROUTES (public access)
// ============================================

// Категории (дерево)
router.get('/categories', productsController.getCategories);

// Список товаров с фильтрами
router.get('/products', productsController.getProducts);

// Карточка товара
router.get('/products/:id', productsController.getProduct);

export default router;
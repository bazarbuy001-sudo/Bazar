import { Router } from 'express';
import * as productsController from '../api/products.controller';
import * as cartController from '../api/cart.controller';
import * as checkoutController from '../api/checkout.controller';
import * as ordersController from '../api/orders.controller';
import * as cabinetController from '../api/cabinet.controller';
import adminRoutes from './admin.routes';

const router = Router();

// ============================================
// PRODUCTS ROUTES
// ============================================

/**
 * Каталог товаров
 */
router.get('/products', productsController.getProducts);
router.get('/products/:id', productsController.getProductById);
router.get('/products/categories', productsController.getCategories);
router.get('/products/colors/:category', productsController.getColorsByCategory);
router.get('/products/price-range', productsController.getPriceRange);

// ============================================
// CART ROUTES
// ============================================

/**
 * Корзина
 */
router.get('/cart', cartController.getCart);
router.post('/cart', cartController.addToCart);
router.put('/cart/:itemId', cartController.updateCartItem);
router.delete('/cart/:itemId', cartController.removeFromCart);
router.delete('/cart', cartController.clearCart);

// ============================================
// CHECKOUT ROUTES
// ============================================

/**
 * Checkout (2-step: контакты → подтверждение)
 */
router.post('/checkout/init', checkoutController.initCheckout);
router.post('/checkout/confirmation', checkoutController.getCheckoutConfirmation);
router.post('/checkout/submit', checkoutController.submitOrder);
router.get('/checkout/session/:sessionId', checkoutController.getCheckoutSession);

// ============================================
// ORDERS ROUTES
// ============================================

/**
 * Управление заказами
 */
router.get('/orders', ordersController.getOrders);
router.get('/orders/:orderId', ordersController.getOrderById);
router.get('/orders/stats', ordersController.getOrderStats);
router.post('/orders/:orderId/cancel', ordersController.cancelOrder);

// ============================================
// CABINET ROUTES (Personal Account)
// ============================================

/**
 * Личный кабинет
 */
router.get('/cabinet/profile', cabinetController.getProfile);
router.put('/cabinet/profile', cabinetController.updateProfile);
router.get('/cabinet/addresses', cabinetController.getAddresses);
router.post('/cabinet/addresses', cabinetController.addAddress);
router.delete('/cabinet/addresses/:addressId', cabinetController.deleteAddress);
router.get('/cabinet/preferences', cabinetController.getPreferences);
router.put('/cabinet/preferences', cabinetController.updatePreferences);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * Admin Panel API
 * Base: /api/v1/admin
 */
router.use('/admin', adminRoutes);

// ============================================
// EXPORT
// ============================================

export default router;

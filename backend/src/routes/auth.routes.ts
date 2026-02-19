import { Router } from 'express';
import { register, login, logout, me } from '../api/auth.controller.js';
import { rateLimits } from '../middleware/rateLimiter.js';

const router = Router();

// ============================================
// AUTH ROUTES
// ============================================

/**
 * POST /api/v1/auth/register
 * Регистрация нового клиента
 * Rate limiting: 3 попытки в минуту
 * 
 * Body:
 * {
 *   "email": "client@example.com",
 *   "password": "SecurePass123!",
 *   "name": "ООО Компания",
 *   "phone": "+7 999 123-45-67",
 *   "city": "Москва",
 *   "inn": "1234567890"
 * }
 */
router.post('/register', rateLimits.register, register);

/**
 * POST /api/v1/auth/login
 * Аутентификация клиента
 * Rate limiting: 5 попыток в минуту
 * 
 * Body:
 * {
 *   "email": "client@example.com",
 *   "password": "SecurePass123!"
 * }
 */
router.post('/login', rateLimits.login, login);

/**
 * POST /api/v1/auth/logout
 * Выход из системы
 */
router.post('/logout', logout);

/**
 * GET /api/v1/auth/me
 * Получение информации о текущем пользователе
 * Требует Bearer token в заголовке Authorization
 */
router.get('/me', me);

export default router;
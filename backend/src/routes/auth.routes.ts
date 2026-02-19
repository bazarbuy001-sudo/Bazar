import { Router } from 'express';
import { register, login, logout, me, loginRateLimit } from '../api/auth.controller';

const router = Router();

// ============================================
// AUTH ROUTES
// ============================================

/**
 * POST /api/v1/auth/register
 * Регистрация нового клиента
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
router.post('/register', register);

/**
 * POST /api/v1/auth/login
 * Аутентификация клиента
 * 
 * Body:
 * {
 *   "email": "client@example.com",
 *   "password": "SecurePass123!"
 * }
 * 
 * Rate limiting: 5 попыток в минуту
 */
router.post('/login', loginRateLimit, login);

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
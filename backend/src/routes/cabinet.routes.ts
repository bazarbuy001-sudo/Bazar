/**
 * Cabinet Routes - Simplified
 */

import { Router } from 'express';
import * as cabinetController from '../api/cabinet.controller.js';
import { authenticateClient } from '../middleware/auth.js';

const router = Router();

// Требует аутентификации клиента
router.use(authenticateClient);

// Профиль
router.get('/profile', cabinetController.getProfile);
router.put('/profile', cabinetController.updateProfile);

// Адреса (временно убрано — фокус на Products API)
// router.get('/addresses', cabinetController.getAddresses);
// router.post('/addresses', cabinetController.addAddress);

// Предпочтения (временно убрано)
// router.get('/preferences', cabinetController.getPreferences);
// router.put('/preferences', cabinetController.updatePreferences);

export default router;
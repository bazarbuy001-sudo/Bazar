/**
 * Cabinet Routes v2
 */

import { Router } from 'express';
import * as cabinetController from '../api/cabinet.v2.controller.js';
import { authenticateClient } from '../middleware/auth.js';

const router = Router();

// Требует аутентификации клиента
router.use(authenticateClient);

// Профиль
router.get('/profile', cabinetController.getProfile);
router.put('/profile', cabinetController.updateProfile);

// Заказы
router.get('/orders', cabinetController.getOrders);
router.get('/orders/:orderId', cabinetController.getOrder);
router.post('/orders/:orderId/cancel', cabinetController.cancelOrder);

// Чаты и сообщения
router.get('/chats', cabinetController.getChats);
router.get('/chats/:chatId/messages', cabinetController.getChatMessages);
router.post('/chats/:chatId/messages', cabinetController.sendMessage);

export default router;

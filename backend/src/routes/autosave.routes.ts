/**
 * Роуты автосохранения
 */

import { Router } from 'express';
import { 
  saveUserState, 
  restoreUserState, 
  clearUserState,
  cleanupExpiredSessions 
} from '../controllers/autosave.controller';

const router = Router();

// Сохранить состояние пользователя
router.post('/autosave', saveUserState);

// Восстановить состояние пользователя
router.get('/autosave', restoreUserState);

// Очистить автосохранение
router.delete('/autosave', clearUserState);

// Очистка устаревших сессий (для cron)
router.delete('/autosave/cleanup', cleanupExpiredSessions);

export default router;
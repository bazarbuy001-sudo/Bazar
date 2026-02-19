/**
 * Контроллер автосохранения
 * DISABLED - not compatible with current database schema
 * TODO: Remove or update for new schema
 */

import { Request, Response } from 'express';

// Disabled autosave functionality

/**
 * Сохранить состояние пользователя
 * POST /api/v1/autosave
 */
export const saveUserState = async (req: Request, res: Response) => {
  res.json({
    success: false,
    error: 'Autosave functionality is currently disabled'
  });
};

/**
 * Восстановить состояние пользователя
 * GET /api/v1/autosave
 */
export const restoreUserState = async (req: Request, res: Response) => {
  res.json({
    success: false,
    error: 'Autosave functionality is currently disabled'
  });
};

/**
 * Очистить состояние пользователя
 * DELETE /api/v1/autosave
 */
export const clearUserState = async (req: Request, res: Response) => {
  res.json({
    success: false,
    error: 'Autosave functionality is currently disabled'
  });
};

/**
 * Очистка истёкших сессий (cron job)
 * DELETE /api/v1/autosave/cleanup
 */
export const cleanupExpiredSessions = async (req: Request, res: Response) => {
  res.json({
    success: false,
    error: 'Autosave functionality is currently disabled'
  });
};
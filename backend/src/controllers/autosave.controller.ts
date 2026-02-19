/**
 * Контроллер автосохранения
 * Сохраняет состояние пользователя на сервере каждые 10 минут
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface AutosaveData {
  timestamp: string;
  cart: any;
  forms: Record<string, any>;
  ui: any;
  filters: any;
  popups: any[];
  scroll: { x: number; y: number };
  page: {
    url: string;
    pathname: string;
    search: string;
    hash: string;
    title: string;
  };
}

/**
 * Сохранить состояние пользователя
 * POST /api/v1/autosave
 */
export const saveUserState = async (req: Request, res: Response) => {
  try {
    const data: AutosaveData = req.body;
    
    // Получаем session_id из cookies или создаем новый
    let sessionId = req.cookies?.session_id;
    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.cookie('session_id', sessionId, { 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
        httpOnly: true 
      });
    }

    // Сохраняем в БД с TTL 2 часа
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    
    await prisma.userSession.upsert({
      where: { sessionId: sessionId },
      update: {
        autosaveData: JSON.stringify(data),
        expiresAt: expiresAt
      },
      create: {
        sessionId: sessionId,
        autosaveData: JSON.stringify(data),
        expiresAt: expiresAt
      }
    });

    res.json({ 
      success: true,
      message: 'Автосохранение выполнено',
      sessionId,
      expiresAt
    });

  } catch (error) {
    console.error('Ошибка автосохранения:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера при автосохранении' 
    });
  }
};

/**
 * Восстановить состояние пользователя
 * GET /api/v1/autosave
 */
export const restoreUserState = async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.session_id;
    
    if (!sessionId) {
      return res.json({ 
        success: true,
        data: null,
        message: 'Нет сохранённого состояния' 
      });
    }

    const session = await prisma.userSession.findUnique({
      where: { sessionId: sessionId }
    });

    if (!session || !session.autosaveData) {
      return res.json({ 
        success: true,
        data: null,
        message: 'Нет сохранённого состояния' 
      });
    }

    // Проверяем, не истекло ли время жизни
    if (session.expiresAt && session.expiresAt < new Date()) {
      // Удаляем устаревшую запись
      await prisma.userSession.delete({
        where: { sessionId: sessionId }
      });
      
      return res.json({ 
        success: true,
        data: null,
        message: 'Сохранённое состояние устарело' 
      });
    }

    const data = JSON.parse(session.autosaveData as string);

    return res.json({ 
      success: true,
      data,
      savedAt: session.updatedAt,
      expiresAt: session.expiresAt
    });

  } catch (error) {
    console.error('Ошибка восстановления:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера при восстановлении состояния' 
    });
  }
};

/**
 * Очистить автосохранение
 * DELETE /api/v1/autosave
 */
export const clearUserState = async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.session_id;
    
    if (sessionId) {
      await prisma.userSession.deleteMany({
        where: { sessionId: sessionId }
      });
    }

    res.json({ 
      success: true,
      message: 'Автосохранение очищено' 
    });

  } catch (error) {
    console.error('Ошибка очистки:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера при очистке состояния' 
    });
  }
};

/**
 * Очистка устаревших сессий (вызывается по cron)
 * DELETE /api/v1/autosave/cleanup
 */
export const cleanupExpiredSessions = async (req: Request, res: Response) => {
  try {
    const result = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    console.log(`Очищено ${result.count} устаревших сессий автосохранения`);
    
    res.json({ 
      success: true,
      message: `Очищено ${result.count} устаревших сессий`,
      deletedCount: result.count
    });

  } catch (error) {
    console.error('Ошибка очистки устаревших сессий:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сервера при очистке' 
    });
  }
};
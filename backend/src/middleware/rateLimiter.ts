/**
 * Simple in-memory rate limiter
 * Production: использовать Redis
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // Окно времени в миллисекундах
  maxAttempts: number; // Максимальное количество попыток
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory storage для rate limiting
const rateLimitStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${req.route?.path || req.path}:${clientIp}`;
    const now = Date.now();

    // Получаем текущую запись
    const record = rateLimitStore.get(key);

    // Если записи нет или окно сброшено
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return next();
    }

    // Проверяем лимит
    if (record.count >= config.maxAttempts) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      });
      return;
    }

    // Увеличиваем счётчик
    record.count++;
    rateLimitStore.set(key, record);

    next();
  };
}

// Cleanup старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Предустановленные конфигурации
export const rateLimits = {
  // Логин: 5 попыток в минуту
  login: createRateLimiter({
    windowMs: 60 * 1000, // 1 минута
    maxAttempts: 5
  }),
  
  // Регистрация: 3 попытки в минуту
  register: createRateLimiter({
    windowMs: 60 * 1000, // 1 минута
    maxAttempts: 3
  }),

  // Общий API: 100 запросов в минуту
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 минута
    maxAttempts: 100
  })
};
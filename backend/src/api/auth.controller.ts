import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { generateJWT, verifyJWT } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const prisma = new PrismaClient();

// =================
// VALIDATION SCHEMAS
// =================

const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, 
           'Пароль должен содержать строчные и прописные буквы, цифры и спецсимволы'),
  name: z.string()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(100, 'Имя не должно превышать 100 символов'),
  phone: z.string().optional(),
  city: z.string().optional(),
  inn: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль обязателен')
});

// =================
// RATE LIMITING
// =================

export const loginRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 5, // максимум 5 попыток за минуту
  message: {
    success: false,
    error: 'Слишком много попыток входа. Попробуйте через минуту.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// =================
// HELPER FUNCTIONS
// =================

/**
 * Генерирует публичный ID для клиента
 */
function generateClientPublicId(): string {
  const randomNumber = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `CL-${randomNumber}`;
}

/**
 * Хеширует пароль с помощью bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Проверяет пароль с хешем
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// =================
// AUTH ENDPOINTS
// =================

/**
 * POST /api/v1/auth/register
 * Регистрация нового клиента
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Валидация входных данных
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Некорректные данные',
        details: result.error.issues
      });
      return;
    }

    const { email, password, name, phone, city, inn } = result.data;

    // Проверка существования пользователя
    const existingClient = await prisma.client.findUnique({
      where: { email }
    });

    if (existingClient) {
      res.status(409).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
      return;
    }

    // Хеширование пароля
    const passwordHash = await hashPassword(password);

    // Генерация публичного ID
    let publicId: string;
    let attempts = 0;
    do {
      publicId = generateClientPublicId();
      attempts++;
      if (attempts > 10) {
        throw new Error('Не удалось сгенерировать уникальный ID');
      }
    } while (await prisma.client.findUnique({ where: { publicId } }));

    // Создание клиента с хешем пароля
    const client = await prisma.client.create({
      data: {
        publicId,
        email,
        passwordHash,
        name,
        phone,
        city,
        inn,
        primaryAuthMethod: 'email'
      }
    });

    // Генерация JWT токена
    const token = generateJWT({
      id: client.id,
      email: client.email,
      role: 'client'
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: client.id,
          publicId: client.publicId,
          email: client.email,
          name: client.name,
          type: 'client'
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
};

/**
 * POST /api/v1/auth/login
 * Аутентификация пользователя
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Валидация входных данных
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Некорректные данные',
        details: result.error.issues
      });
      return;
    }

    const { email, password } = result.data;

    // Поиск клиента
    const client = await prisma.client.findUnique({
      where: { email }
    });

    if (!client || !client.isActive || !client.passwordHash) {
      // НЕ раскрываем информацию о том, что именно неверно
      res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
      return;
    }

    // Проверка пароля
    const isValidPassword = await verifyPassword(password, client.passwordHash);
    
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
      return;
    }

    // Генерация JWT токена
    const token = generateJWT({
      id: client.id,
      email: client.email,
      role: 'client'
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: client.id,
          publicId: client.publicId,
          email: client.email,
          name: client.name,
          type: 'client'
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
};

/**
 * POST /api/v1/auth/logout
 * Выход из системы
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // В простой JWT реализации logout происходит на клиенте
    // (удаление токена из localStorage)
    // 
    // Для более сложной реализации можно добавить blacklist токенов
    // или использовать refresh tokens
    
    res.status(200).json({
      success: true,
      message: 'Успешно вышли из системы'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
};

/**
 * GET /api/v1/auth/me
 * Получение информации о текущем пользователе
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    // authMiddleware должен быть применён к этому роуту
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Получение актуальных данных пользователя
    const client = await prisma.client.findUnique({
      where: { id: decoded.id }
    });

    if (!client || !client.isActive) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: client.id,
        publicId: client.publicId,
        email: client.email,
        name: client.name,
        phone: client.phone,
        city: client.city,
        inn: client.inn,
        type: 'client',
        isActive: client.isActive,
        createdAt: client.createdAt
      }
    });

  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
};
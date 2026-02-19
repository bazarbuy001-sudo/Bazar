import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      user?: {
        id: string;
        role: string;
        email?: string;
        adminId?: string;
        clientId?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
}

/**
 * Verify JWT token and attach user info to request
 */
export const verifyJWT = (token: string): DecodedToken | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate JWT token
 */
export const generateJWT = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

/**
 * Middleware: Require valid JWT token
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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

  req.userId = decoded.id;
  req.userRole = decoded.role;
  req.user = decoded;

  next();
};

/**
 * Middleware: Require admin role
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    res.status(403).json({ 
      success: false,
      error: 'Admin access required' 
    });
    return;
  }

  next();
};

/**
 * Middleware: Authenticate Admin (JWT required + admin role)
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
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

  if (decoded.role !== 'admin' && decoded.role !== 'superadmin' && decoded.role !== 'manager') {
    res.status(403).json({ 
      success: false,
      error: 'Admin access required' 
    });
    return;
  }

  req.user = decoded;
  req.user.adminId = decoded.id;
  next();
};

/**
 * Middleware: Authenticate Client (JWT required + client type)
 */
export const authenticateClient = (req: Request, res: Response, next: NextFunction): void => {
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

  // Проверить что это клиент (не админ)
  if (decoded.role && (decoded.role === 'admin' || decoded.role === 'superadmin' || decoded.role === 'manager')) {
    res.status(403).json({ 
      success: false,
      error: 'Client access required' 
    });
    return;
  }

  req.user = decoded;
  req.user.clientId = decoded.id;
  next();
};

/**
 * Middleware: Optional authentication
 * Извлекает пользователя из JWT если токен присутствует, но не требует его обязательно
 * Используется для API которые должны работать как для авторизованных, так и для гостей
 */
export const authenticateOptional = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  // Если токена нет - продолжаем без пользователя
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyJWT(token);

  // Если токен невалидный - продолжаем без пользователя (не возвращаем ошибку)
  if (!decoded) {
    next();
    return;
  }

  // Если токен валидный - добавляем пользователя в request
  req.user = decoded;
  
  // Для клиентов добавляем clientId
  if (decoded.role !== 'admin' && decoded.role !== 'superadmin' && decoded.role !== 'manager') {
    req.user.clientId = decoded.id;
  }

  next();
};

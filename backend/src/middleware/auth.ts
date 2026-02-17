import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      user?: any;
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
export const generateJWT = (payload: any): string => {
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

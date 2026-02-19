import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
  id: string;
}

const logger = (req: Request, res: Response, next: NextFunction): void => {
  (req as RequestWithId).id = uuidv4();
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - RequestId: ${(req as RequestWithId).id}`
    );
  });

  next();
};

export default logger;

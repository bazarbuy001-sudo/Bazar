import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import logger from './middleware/logger.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: 'bazar-buy-backend-auth-only'
  });
});

// AUTH ROUTES ONLY
app.use('/api/v1/auth', authRoutes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    requestId: (req as any).id,
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    success: false,
    error: 'Not Found',
    path: req.path,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 AUTH Server running at http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api/v1/auth`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/v1/health`);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
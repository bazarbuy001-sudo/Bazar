import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import logger from './middleware/logger';
import apiRoutes from './routes';

// Optional: Import multer (will be added when installed)
let multer: any;
try {
  multer = require('multer');
} catch (e) {
  console.warn('multer not installed, file uploads will be disabled');
}

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads (if available)
if (multer) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
      }
    },
  });

  // File upload middleware for specific routes
  app.use('/api/v1/admin/products/upload', upload.array('images', 5));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/v1', apiRoutes);

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

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// WebSocket Server for real-time chats
const wss = new WebSocketServer({ server });

// Track connected clients by chat room
const chatConnections: { [key: string]: Set<WebSocket> } = {};

// WebSocket connection handler
wss.on('connection', (ws: WebSocket, req: any) => {
  const url = req.url || '';
  const chatIdMatch = url.match(/\/chat\/([^/?]+)/);
  
  if (!chatIdMatch) {
    ws.close(1008, 'Invalid chat ID');
    return;
  }

  const chatId = chatIdMatch[1];

  // Initialize chat room if not exists
  if (!chatConnections[chatId]) {
    chatConnections[chatId] = new Set();
  }

  chatConnections[chatId].add(ws);
  console.log(`✅ Client connected to chat: ${chatId} (${chatConnections[chatId].size} clients)`);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: 'connection',
      message: 'Connected to chat',
      chatId: chatId,
      timestamp: new Date().toISOString(),
    })
  );

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());

      // Broadcast to all clients in this chat
      const broadcastMessage = {
        type: 'message',
        id: `msg-${Date.now()}`,
        chatId: chatId,
        sender: message.sender || 'client',
        senderName: message.senderName || 'Anonymous',
        message: message.message || '',
        timestamp: new Date().toISOString(),
      };

      chatConnections[chatId].forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(broadcastMessage));
        }
      });

      console.log(`📨 Message in ${chatId}: ${message.message}`);
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
        })
      );
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    chatConnections[chatId].delete(ws);
    console.log(`❌ Client disconnected from chat: ${chatId} (${chatConnections[chatId].size} remaining)`);

    // Clean up empty chat rooms
    if (chatConnections[chatId].size === 0) {
      delete chatConnections[chatId];
    }
  });

  // Handle errors
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api/v1`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`💬 WebSocket Chat: ws://localhost:${PORT}/chat/:chatId`);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export { app, prisma, wss };

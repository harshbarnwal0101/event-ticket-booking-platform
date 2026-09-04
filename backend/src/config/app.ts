import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from './redis';
import authRoutes from '../modules/auth/routes/auth.routes';
import eventRoutes from '../modules/events/routes/event.routes';
import venueRoutes from '../modules/events/routes/venue.routes';

export const createApp = (): {
  app: Express;
  httpServer: ReturnType<typeof createServer>;
  io: SocketIOServer;
} => {
  const app = express();
  const httpServer = createServer(app);

  // CORS configuration
  const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200,
  };

  // Middleware
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // Request ID middleware for logging/tracing
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    (_req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  // Socket.IO setup with Redis adapter for scaling (optional for dev)
  const ioOptions: any = {
    cors: corsOptions,
  };

  const redisClient = getRedisClient();
  if (redisClient) {
    ioOptions.adapter = createAdapter(redisClient as any, redisClient.duplicate() as any);
  }

  const io = new SocketIOServer(httpServer, ioOptions);

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/venues', venueRoutes);

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      redis: redisClient ? 'connected' : 'disconnected'
    });
  });

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'Event Ticket Booking Platform API',
      version: '1.0.0',
      status: 'running',
    });
  });

  return { app, httpServer, io };
};

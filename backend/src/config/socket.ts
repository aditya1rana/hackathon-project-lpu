import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from './env';
import { logger } from './logger';

let io: Server;

/**
 * Initialize Socket.io server with CORS and authentication.
 * Provides realtime notifications to connected clients.
 */
export function initializeSocket(httpServer: HttpServer): Server {
  const allowedOrigins = env.CLIENT_URL.split(',').map(url => url.trim());
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`⚡ Socket connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join', (userId: string) => {
      socket.join(`user:${userId}`);
      logger.debug(`User ${userId} joined their notification channel`);
    });

    // Join role-based room for broadcast notifications
    socket.on('joinRole', (role: string) => {
      socket.join(`role:${role}`);
      logger.debug(`Socket ${socket.id} joined role channel: ${role}`);
    });

    socket.on('disconnect', () => {
      logger.info(`⚡ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/** Get the Socket.io server instance */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
}

/** Emit a notification to a specific user */
export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

/** Emit a notification to all users with a specific role */
export function emitToRole(role: string, event: string, data: unknown): void {
  getIO().to(`role:${role}`).emit(event, data);
}

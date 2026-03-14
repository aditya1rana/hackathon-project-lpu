import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { initializeSocket } from './config/socket';
import redis from './config/redis';
import prisma from './config/database';
import { initCronJobs } from './jobs/cron';

/**
 * Server bootstrap — connects all services and starts listening.
 */
async function bootstrap(): Promise<void> {
  try {
    // Connect to PostgreSQL via Prisma
    await prisma.$connect();
    logger.info('🐘 PostgreSQL connected');

    // Connect to Redis
    await redis.connect();

    // Create HTTP server and attach Socket.io
    const httpServer = http.createServer(app);
    initializeSocket(httpServer);
    logger.info('⚡ Socket.io initialized');

    // Start cron jobs
    initCronJobs();
    logger.info('⏰ Cron jobs initialized');

    // Start listening
    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📋 Health check: http://localhost:${env.PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Gracefully shutting down...`);
      httpServer.close();
      await prisma.$disconnect();
      redis.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

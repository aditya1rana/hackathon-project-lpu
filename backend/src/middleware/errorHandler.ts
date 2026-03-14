import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Global error handling middleware.
 * Catches all errors and returns a standardized JSON response.
 * Logs full stack traces in development, sanitizes in production.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default to 500 internal server error
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log the error
  if (!isOperational || statusCode >= 500) {
    logger.error(`[${statusCode}] ${err.message}`, {
      stack: err.stack,
      name: err.name,
    });
  } else {
    logger.warn(`[${statusCode}] ${err.message}`);
  }

  // Prisma known errors
  if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Database operation failed';
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 422;
    message = 'Validation failed';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err.message,
    }),
  });
}

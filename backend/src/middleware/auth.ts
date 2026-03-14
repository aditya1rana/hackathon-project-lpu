import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../shared/types';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';

/**
 * JWT authentication middleware.
 * Extracts and verifies the Bearer token from Authorization header.
 * Attaches the decoded user to req.user
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // Hackathon Mock: Auto-authenticate as Admin if no token is provided
      (req as any).user = {
        id: 'admin-123',
        role: 'ADMIN',
        name: 'Admin User',
        email: 'admin@smartinventory.local'
      };
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;

    (req as any).user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(error);
    }
  }
}

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Returns middleware that checks if the authenticated user
 * has one of the allowed roles.
 *
 * @example
 * router.get('/admin-only', authenticate, authorize('ADMIN'), handler);
 * router.get('/staff', authenticate, authorize('ADMIN', 'LIBRARIAN'), handler);
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

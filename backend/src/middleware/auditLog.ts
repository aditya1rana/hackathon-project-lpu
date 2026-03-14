import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthUser } from '../shared/types';

/**
 * Audit logging middleware.
 * Automatically logs all state-changing operations (POST, PUT, PATCH, DELETE)
 * to the audit_logs table for compliance and debugging.
 */
export function auditLog(entity: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Only audit state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const action = req.method === 'POST'
      ? 'CREATE'
      : req.method === 'DELETE'
        ? 'DELETE'
        : 'UPDATE';

    // Store the original json method to intercept the response
    const originalJson = _res.json.bind(_res);
    const user = (req as any).user as AuthUser | undefined;

    _res.json = function (body: any) {
      // Log after response is sent (non-blocking)
      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              action,
              entity,
              entityId: req.params.id || body?.data?.id || null,
              newValues: req.method !== 'DELETE' ? req.body : undefined,
              ipAddress: req.ip || req.socket.remoteAddress || null,
              userAgent: req.get('user-agent') || null,
              userId: user?.id || null,
            },
          });
        } catch {
          // Audit logging should never break the request
        }
      });

      return originalJson(body);
    };

    next();
  };
}

import { Router, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError, parsePaginationQuery, buildPaginationMeta, sendPaginated } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/types';
import { emitToUser } from '../../config/socket';

const router = Router();
router.use(authenticate);

/**
 * @route GET /api/notifications
 * @desc  Get current user's notifications
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePaginationQuery(req.query);
    const q = req.query as Record<string, string>;
    const unreadOnly = q.unread === 'true';
    const where: any = { userId: (req as any).user!.id };
    if (unreadOnly) where.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    res.json({ success: true, data: notifications, meta, unreadCount });
  } catch (error) { next(error); }
});

/**
 * @route PATCH /api/notifications/:id/read
 * @desc  Mark a notification as read
 */
router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    const notification = await prisma.notification.update({
      where: { id: p.id },
      data: { read: true },
    });
    sendSuccess(res, notification, 'Marked as read');
  } catch (error) { next(error); }
});

/**
 * @route PATCH /api/notifications/read-all
 * @desc  Mark all notifications as read
 */
router.patch('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) { next(error); }
});

/**
 * @route DELETE /api/notifications/:id
 * @desc  Delete a notification
 */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    await prisma.notification.delete({ where: { id: p.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;

// ─── Notification Helper ────────────────────────────────────
// Used by other modules to create notifications

export async function createNotification(
  userId: string,
  type: 'LOW_STOCK' | 'APPROVAL' | 'RETURN_REMINDER' | 'PENALTY' | 'SYSTEM' | 'PROCUREMENT',
  title: string,
  message: string,
  metadata?: any
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, metadata },
  });

  // Push realtime via Socket.io
  emitToUser(userId, 'notification:new', notification);

  return notification;
}

/**
 * Send notifications to all users with a specific role.
 */
export async function notifyRole(
  roleName: string,
  type: 'LOW_STOCK' | 'APPROVAL' | 'RETURN_REMINDER' | 'PENALTY' | 'SYSTEM' | 'PROCUREMENT',
  title: string,
  message: string,
  metadata?: any
) {
  const users = await prisma.user.findMany({
    where: { role: { name: roleName as any }, isActive: true, deletedAt: null },
    select: { id: true },
  });

  const notifications = await Promise.all(
    users.map((u) => createNotification(u.id, type, title, message, metadata))
  );

  return notifications;
}

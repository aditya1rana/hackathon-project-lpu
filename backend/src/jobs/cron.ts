import cron from 'node-cron';
import prisma from '../config/database';
import { notifyRole, createNotification } from '../modules/notification/notification.routes';
import { logger } from '../config/logger';

/**
 * Initialize all cron jobs for the application.
 * Runs background tasks for low-stock alerts, return reminders,
 * and expired token cleanup.
 */
export function initCronJobs(): void {
  // ─── Low Stock Alert — Every 6 hours ──────────────────────
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('[CRON] Running low stock alert check');

      const lowStockItems = await prisma.$queryRaw<any[]>`
        SELECT i.id, i.name, i.quantity, i.min_stock, c.name as category_name
        FROM inventory_items i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.quantity <= i.min_stock 
          AND i.deleted_at IS NULL
      `;

      if (lowStockItems.length > 0) {
        const itemList = lowStockItems
          .slice(0, 10)
          .map((i: any) => `${i.name} (${i.quantity}/${i.min_stock})`)
          .join(', ');

        await notifyRole(
          'ADMIN',
          'LOW_STOCK',
          `⚠️ ${lowStockItems.length} items below minimum stock`,
          `Low stock items: ${itemList}${lowStockItems.length > 10 ? ` and ${lowStockItems.length - 10} more` : ''}`,
          { items: lowStockItems }
        );

        await notifyRole(
          'LIBRARIAN',
          'LOW_STOCK',
          `⚠️ ${lowStockItems.length} items below minimum stock`,
          `Low stock items: ${itemList}`,
          { items: lowStockItems }
        );

        logger.info(`[CRON] Sent low stock alerts for ${lowStockItems.length} items`);
      }
    } catch (error) {
      logger.error('[CRON] Low stock alert failed:', error);
    }
  });

  // ─── Return Reminders — Every day at 9 AM ─────────────────
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('[CRON] Running return reminder check');

      // Find overdue requests
      const overdueRequests = await prisma.request.findMany({
        where: {
          status: 'ISSUED',
          dueDate: { lt: new Date() },
        },
        include: {
          user: { select: { id: true, firstName: true, email: true } },
          item: { select: { name: true } },
        },
      });

      for (const req of overdueRequests) {
        await createNotification(
          req.userId,
          'RETURN_REMINDER',
          '📅 Overdue Return Reminder',
          `Your borrowed item "${req.item.name}" was due on ${req.dueDate?.toLocaleDateString()}. Please return it to avoid penalties.`,
          { requestId: req.id, itemName: req.item.name, dueDate: req.dueDate }
        );
      }

      // Find requests due tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      const dueTomorrow = await prisma.request.findMany({
        where: {
          status: 'ISSUED',
          dueDate: { gte: startOfTomorrow, lte: endOfTomorrow },
        },
        include: {
          user: { select: { id: true } },
          item: { select: { name: true } },
        },
      });

      for (const req of dueTomorrow) {
        await createNotification(
          req.userId,
          'RETURN_REMINDER',
          '⏰ Return Due Tomorrow',
          `Reminder: "${req.item.name}" is due for return tomorrow.`,
          { requestId: req.id }
        );
      }

      logger.info(`[CRON] Sent ${overdueRequests.length} overdue + ${dueTomorrow.length} upcoming reminders`);
    } catch (error) {
      logger.error('[CRON] Return reminder failed:', error);
    }
  });

  // ─── Cleanup Expired Tokens — Daily at midnight ───────────
  cron.schedule('0 0 * * *', async () => {
    try {
      const deleted = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info(`[CRON] Cleaned up ${deleted.count} expired refresh tokens`);

      // Also clean up used/expired OTPs
      const otpsDeleted = await prisma.oTP.deleteMany({
        where: {
          OR: [
            { used: true },
            { expiresAt: { lt: new Date() } },
          ],
        },
      });
      logger.info(`[CRON] Cleaned up ${otpsDeleted.count} used/expired OTPs`);
    } catch (error) {
      logger.error('[CRON] Token cleanup failed:', error);
    }
  });

  logger.info('⏰ Cron jobs registered: low-stock (6h), return-reminders (9am), token-cleanup (midnight)');
}

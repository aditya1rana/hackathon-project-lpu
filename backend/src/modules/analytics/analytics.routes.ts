import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { cache } from '../../config/redis';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT'));

const ANALYTICS_CACHE_TTL = 600; // 10 minutes

/**
 * @route GET /api/analytics/overview
 * @desc  Dashboard overview statistics
 */
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'analytics:overview';
    const cached = await cache.get(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    const [
      totalItems,
      totalCategories,
      totalUsers,
      totalRequests,
      pendingRequests,
      lowStockCount,
      totalTransactions,
    ] = await Promise.all([
      prisma.inventoryItem.count({ where: { deletedAt: null } }),
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.request.count(),
      prisma.request.count({ where: { status: 'PENDING' } }),
      prisma.$queryRaw<[{ count: BigInt }]>`
        SELECT COUNT(*) as count FROM inventory_items 
        WHERE quantity <= min_stock AND deleted_at IS NULL
      `,
      prisma.transaction.count(),
    ]);

    const data = {
      totalItems,
      totalCategories,
      totalUsers,
      totalRequests,
      pendingRequests,
      lowStockCount: Number(lowStockCount[0]?.count || 0),
      totalTransactions,
    };

    await cache.set(cacheKey, data, ANALYTICS_CACHE_TTL);
    sendSuccess(res, data);
  } catch (error) { next(error); }
});

/**
 * @route GET /api/analytics/most-used
 * @desc  Most used items (by transaction count)
 */
router.get('/most-used', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const cacheKey = `analytics:most-used:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    const items = await prisma.transaction.groupBy({
      by: ['itemId'],
      where: { type: 'ISSUE' },
      _count: { id: true },
      _sum: { quantity: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // Enrich with item details
    const enriched = await Promise.all(
      items.map(async (i) => {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: i.itemId },
          select: { name: true, category: { select: { name: true } }, location: true },
        });
        return {
          itemId: i.itemId,
          name: item?.name,
          category: item?.category?.name,
          location: item?.location,
          totalIssues: i._count.id,
          totalQuantityIssued: i._sum.quantity,
        };
      })
    );

    await cache.set(cacheKey, enriched, ANALYTICS_CACHE_TTL);
    sendSuccess(res, enriched);
  } catch (error) { next(error); }
});

/**
 * @route GET /api/analytics/dead-stock
 * @desc  Items with zero transactions in the last N days
 */
router.get('/dead-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Number(req.query.days) || 90;
    const cacheKey = `analytics:dead-stock:${days}`;
    const cached = await cache.get(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const deadStock = await prisma.$queryRaw`
      SELECT i.id, i.name, i.quantity, i.location, c.name as category_name,
             COALESCE(MAX(t.created_at), i.created_at) as last_activity
      FROM inventory_items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN transactions t ON i.id = t.item_id
      WHERE i.deleted_at IS NULL
      GROUP BY i.id, i.name, i.quantity, i.location, c.name, i.created_at
      HAVING COALESCE(MAX(t.created_at), i.created_at) < ${cutoff}
      ORDER BY last_activity ASC
    `;

    await cache.set(cacheKey, deadStock, ANALYTICS_CACHE_TTL);
    sendSuccess(res, deadStock);
  } catch (error) { next(error); }
});

/**
 * @route GET /api/analytics/category-usage
 * @desc  Usage breakdown by category
 */
router.get('/category-usage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'analytics:category-usage';
    const cached = await cache.get(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    const data = await prisma.$queryRaw`
      SELECT c.id, c.name,
             COUNT(DISTINCT i.id)::int as item_count,
             COALESCE(SUM(i.quantity), 0)::int as total_stock,
             COUNT(t.id)::int as total_transactions
      FROM categories c
      LEFT JOIN inventory_items i ON c.id = i.category_id AND i.deleted_at IS NULL
      LEFT JOIN transactions t ON i.id = t.item_id
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.name
      ORDER BY total_transactions DESC
    `;

    await cache.set(cacheKey, data, ANALYTICS_CACHE_TTL);
    sendSuccess(res, data);
  } catch (error) { next(error); }
});

/**
 * @route GET /api/analytics/department-usage
 * @desc  Usage breakdown by department
 */
router.get('/department-usage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'analytics:department-usage';
    const cached = await cache.get(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    const data = await prisma.$queryRaw`
      SELECT u.department,
             COUNT(r.id)::int as total_requests,
             COUNT(CASE WHEN r.status = 'ISSUED' OR r.status = 'RETURNED' THEN 1 END)::int as fulfilled,
             COALESCE(SUM(r.quantity), 0)::int as total_quantity
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY total_requests DESC
    `;

    await cache.set(cacheKey, data, ANALYTICS_CACHE_TTL);
    sendSuccess(res, data);
  } catch (error) { next(error); }
});

/**
 * @route GET /api/analytics/monthly-trends
 * @desc  Monthly usage trends for the past 12 months
 */
router.get('/monthly-trends', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'analytics:monthly-trends';
    const cached = await cache.get(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    const data = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        type,
        COUNT(id)::int as transaction_count,
        COALESCE(SUM(quantity), 0)::int as total_quantity
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM'), type
      ORDER BY month DESC
    `;

    await cache.set(cacheKey, data, ANALYTICS_CACHE_TTL);
    sendSuccess(res, data);
  } catch (error) { next(error); }
});

export default router;

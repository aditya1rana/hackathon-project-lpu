import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';
import { sendSuccess, sendError, parsePaginationQuery, buildPaginationMeta, sendPaginated } from '../../shared/utils/response';
import { cache } from '../../config/redis';
import { env } from '../../config/env';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN', 'LIBRARIAN'));

/**
 * @route GET /api/predictions
 * @desc  List stored predictions
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(req.query);
    const q = req.query as Record<string, string>;
    const type = q.type || undefined;
    const itemId = q.itemId || undefined;

    const where: any = {};
    if (type) where.type = type;
    if (itemId) where.itemId = itemId;

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        include: { item: { select: { id: true, name: true, quantity: true, minStock: true } } },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.prediction.count({ where }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    sendPaginated(res, { data: predictions, meta });
  } catch (error) { next(error); }
});

/**
 * @route POST /api/predictions/demand
 * @desc  Trigger demand prediction via AI service
 */
router.post('/demand', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.body;

    // Fetch usage history for the item
    const usageLogs = await prisma.usageLog.findMany({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
      select: { quantity: true, createdAt: true, action: true },
    });

    if (usageLogs.length < 5) {
      sendError(res, 'Insufficient data for prediction (need at least 5 usage records)', 400);
      return;
    }

    // Call AI microservice
    const response = await fetch(`${env.AI_SERVICE_URL}/predict/demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        usage_data: usageLogs.map((l) => ({
          quantity: l.quantity,
          date: l.createdAt.toISOString(),
          action: l.action,
        })),
      }),
    });

    if (!response.ok) {
      sendError(res, 'AI service unavailable', 503);
      return;
    }

    const prediction = await response.json() as any;

    // Store prediction in database
    const stored = await prisma.prediction.create({
      data: {
        type: 'DEMAND',
        predictedValue: prediction.predicted_demand || 0,
        confidence: prediction.confidence || 0,
        metadata: prediction as any,
        predictedFor: new Date(prediction.predicted_for || Date.now() + 30 * 24 * 60 * 60 * 1000),
        itemId,
      },
    });

    sendSuccess(res, stored, 'Demand prediction generated');
  } catch (error) { next(error); }
});

/**
 * @route POST /api/predictions/stockout
 * @desc  Predict when an item will go out of stock
 */
router.post('/stockout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.body;
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) { sendError(res, 'Item not found', 404); return; }

    const usageLogs = await prisma.usageLog.findMany({
      where: { itemId, action: 'ISSUE' },
      orderBy: { createdAt: 'asc' },
    });

    if (usageLogs.length < 5) {
      sendError(res, 'Insufficient data for prediction', 400);
      return;
    }

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/predict/stockout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          current_stock: item.quantity,
          min_stock: item.minStock,
          usage_data: usageLogs.map((l) => ({
            quantity: l.quantity,
            date: l.createdAt.toISOString(),
          })),
        }),
      });

      if (!response.ok) throw new Error('AI service unavailable');

      const prediction = await response.json() as any;

      const stored = await prisma.prediction.create({
        data: {
          type: 'STOCKOUT',
          predictedValue: prediction.days_until_stockout || 0,
          confidence: prediction.confidence || 0,
          metadata: prediction as any,
          predictedFor: new Date(Date.now() + (prediction.days_until_stockout || 30) * 24 * 60 * 60 * 1000),
          itemId,
        },
      });

      sendSuccess(res, stored, 'Stockout prediction generated');
    } catch {
      // Fallback: simple linear prediction if AI service is down
      const totalIssued = usageLogs.reduce((sum, l) => sum + l.quantity, 0);
      const daySpan = Math.max(1, (Date.now() - usageLogs[0].createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const dailyRate = totalIssued / daySpan;
      const daysUntilStockout = dailyRate > 0 ? Math.floor(item.quantity / dailyRate) : 999;

      const stored = await prisma.prediction.create({
        data: {
          type: 'STOCKOUT',
          predictedValue: daysUntilStockout,
          confidence: 0.5,
          metadata: { method: 'linear_fallback', dailyRate, totalIssued, daySpan },
          predictedFor: new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000),
          itemId,
        },
      });

      sendSuccess(res, stored, 'Stockout prediction generated (fallback method)');
    }
  } catch (error) { next(error); }
});

/**
 * @route GET /api/predictions/restock
 * @desc  Get AI restock suggestions
 */
router.get('/restock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'predictions:restock';
    const cached = await cache.get(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    // Get all low-stock items
    const lowStockItems = await prisma.$queryRaw<any[]>`
      SELECT i.id, i.name, i.quantity, i.min_stock, i.unit_price,
             s.name as supplier_name, s.lead_time_days, s.id as supplier_id,
             c.name as category_name
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.quantity <= i.min_stock * 1.5
        AND i.deleted_at IS NULL
      ORDER BY (i.quantity::float / NULLIF(i.min_stock, 0)) ASC
    `;

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/predict/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lowStockItems }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        await cache.set(cacheKey, suggestions, 300);
        sendSuccess(res, suggestions, 'AI restock suggestions generated');
        return;
      }
    } catch {} // AI service unavailable, use fallback

    // Fallback: simple rule-based suggestions
    const suggestions = lowStockItems.map((item: any) => ({
      itemId: item.id,
      itemName: item.name,
      currentStock: item.quantity,
      minStock: item.min_stock,
      suggestedOrderQuantity: Math.max(item.min_stock * 2 - item.quantity, item.min_stock),
      estimatedCost: (item.min_stock * 2 - item.quantity) * Number(item.unit_price || 0),
      supplier: item.supplier_name,
      leadTimeDays: item.lead_time_days,
      priority: item.quantity <= 0 ? 'CRITICAL' : item.quantity <= item.min_stock / 2 ? 'HIGH' : 'MEDIUM',
    }));

    await cache.set(cacheKey, suggestions, 300);
    sendSuccess(res, suggestions, 'Restock suggestions generated (rule-based)');
  } catch (error) { next(error); }
});

/**
 * @route POST /api/predictions/query
 * @desc  AI query endpoint — "What items will run out next month?"
 */
router.post('/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question } = req.body;
    if (!question) {
      sendError(res, 'Question is required', 400);
      return;
    }

    // Get contextual data for the AI
    const [lowStockItems, recentPredictions, topUsedItems] = await Promise.all([
      prisma.$queryRaw`
        SELECT i.name, i.quantity, i.min_stock
        FROM inventory_items i WHERE i.quantity <= i.min_stock AND i.deleted_at IS NULL
      `,
      prisma.prediction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { item: { select: { name: true, quantity: true } } },
      }),
      prisma.transaction.groupBy({
        by: ['itemId'],
        where: { type: 'ISSUE', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
    ]);

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: { lowStockItems, recentPredictions, topUsedItems },
        }),
      });

      if (response.ok) {
        const answer = await response.json();
        sendSuccess(res, answer, 'AI query answered');
        return;
      }
    } catch {} // AI service unavailable

    // Fallback: pattern-matched responses
    const questionLower = question.toLowerCase();
    let answer: any = { answer: 'Unable to process this query at the moment.', data: {} };

    if (questionLower.includes('run out') || questionLower.includes('stock out') || questionLower.includes('deplete')) {
      answer = {
        answer: `Based on current stock levels, ${(lowStockItems as any[]).length} items are at or below minimum stock.`,
        data: lowStockItems,
        suggestion: 'Consider restocking these items immediately.',
      };
    } else if (questionLower.includes('most used') || questionLower.includes('popular')) {
      answer = {
        answer: `Top used items in the last 30 days by issue volume.`,
        data: topUsedItems,
      };
    } else if (questionLower.includes('prediction') || questionLower.includes('forecast')) {
      answer = {
        answer: `Here are the ${recentPredictions.length} most recent predictions.`,
        data: recentPredictions,
      };
    }

    sendSuccess(res, answer);
  } catch (error) { next(error); }
});

export default router;

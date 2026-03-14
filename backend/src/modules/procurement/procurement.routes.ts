import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditLog } from '../../middleware/auditLog';
import { sendSuccess, sendCreated, sendError, sendNoContent, parsePaginationQuery, buildPaginationMeta, sendPaginated } from '../../shared/utils/response';
import { z } from 'zod';
import { env } from '../../config/env';
import { cache } from '../../config/redis';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN', 'LIBRARIAN'));

// ─── Validators ─────────────────────────────────────────────

const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
});

const createProcurementSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  supplierId: z.string().min(1),
  items: z.array(z.object({
    itemId: z.string(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
  })),
  notes: z.string().optional(),
});

// ─── Procurement Routes ──────────────────────────────────────

/** GET /api/procurements — List all procurements */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(req.query);
    const q = req.query as Record<string, string>;
    const status = q.status || undefined;

    const where: any = {};
    if (status) where.status = status;

    const [procurements, total] = await Promise.all([
      prisma.procurement.findMany({
        where,
        include: { supplier: { select: { id: true, name: true, contactName: true, email: true } } },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.procurement.count({ where }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    sendPaginated(res, { data: procurements, meta });
  } catch (error) { next(error); }
});

/** GET /api/procurements/:id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    const procurement = await prisma.procurement.findUnique({
      where: { id: p.id },
      include: { supplier: true },
    });
    if (!procurement) { sendError(res, 'Procurement not found', 404); return; }
    sendSuccess(res, procurement);
  } catch (error) { next(error); }
});

/** POST /api/procurements — Create a procurement order */
router.post('/', validate(createProcurementSchema), auditLog('Procurement'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, supplierId, items, notes } = req.body;

    // Calculate estimated cost
    const estimatedCost = items.reduce((sum: number, i: any) => sum + i.quantity * i.unitPrice, 0);

    const procurement = await prisma.procurement.create({
      data: {
        title,
        description,
        supplierId,
        items,
        notes,
        estimatedCost,
      },
      include: { supplier: true },
    });

    sendCreated(res, procurement, 'Procurement order created');
  } catch (error) { next(error); }
});

/** PATCH /api/procurements/:id/status — Update procurement status */
router.patch('/:id/status', auditLog('Procurement'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    const { status, actualCost } = req.body;
    const updateData: any = { status };

    if (status === 'ORDERED') updateData.orderedAt = new Date();
    if (status === 'RECEIVED') {
      updateData.receivedAt = new Date();
      if (actualCost) updateData.actualCost = actualCost;

      // Auto-restock items when procurement is received
      const procurement = await prisma.procurement.findUnique({ where: { id: p.id } });
      if (procurement) {
        const items = procurement.items as any[];
        for (const item of items) {
          await prisma.inventoryItem.update({
            where: { id: item.itemId },
            data: { quantity: { increment: item.quantity } },
          });
          await prisma.transaction.create({
            data: {
              type: 'RESTOCK',
              quantity: item.quantity,
              notes: `Procurement #${procurement.id}`,
              itemId: item.itemId,
            },
          });
        }
      }
    }

    const updated = await prisma.procurement.update({
      where: { id: p.id },
      data: updateData,
      include: { supplier: true },
    });

    sendSuccess(res, updated, `Procurement ${status.toLowerCase()}`);
  } catch (error) { next(error); }
});

/** POST /api/procurements/budget-estimate — AI budget estimation */
router.post('/budget-estimate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'procurement:budget-estimate';
    const cached = await cache.get(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    // Get all items needing restock
    const lowStockItems = await prisma.$queryRaw<any[]>`
      SELECT i.id, i.name, i.quantity, i.min_stock, i.unit_price,
             s.name as supplier_name, s.lead_time_days
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.quantity <= i.min_stock AND i.deleted_at IS NULL
    `;

    const estimate = {
      itemsNeedingRestock: lowStockItems.length,
      items: lowStockItems.map((item: any) => ({
        name: item.name,
        currentStock: item.quantity,
        minStock: item.min_stock,
        orderQuantity: Math.max(item.min_stock * 2 - item.quantity, 0),
        unitPrice: Number(item.unit_price) || 0,
        lineTotal: Math.max(item.min_stock * 2 - item.quantity, 0) * (Number(item.unit_price) || 0),
        supplier: item.supplier_name,
        leadTimeDays: item.lead_time_days,
      })),
      totalEstimatedCost: lowStockItems.reduce((sum: number, item: any) => {
        return sum + Math.max(item.min_stock * 2 - item.quantity, 0) * (Number(item.unit_price) || 0);
      }, 0),
    };

    await cache.set(cacheKey, estimate, 300);
    sendSuccess(res, estimate, 'Budget estimation generated');
  } catch (error) { next(error); }
});

export default router;

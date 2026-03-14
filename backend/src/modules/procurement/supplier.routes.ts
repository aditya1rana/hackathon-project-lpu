import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditLog } from '../../middleware/auditLog';
import { sendSuccess, sendCreated, sendError, sendNoContent, parsePaginationQuery, buildPaginationMeta, sendPaginated } from '../../shared/utils/response';
import { z } from 'zod';

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

// ─── Supplier Routes ─────────────────────────────────────────

/** GET /api/suppliers — List suppliers with pagination */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const { page, limit, sortBy, sortOrder, search, skip } = parsePaginationQuery(q as Record<string, unknown>);
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { items: true, procurements: true } } },
      }),
      prisma.supplier.count({ where }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    sendPaginated(res, { data: suppliers, meta });
  } catch (error) { next(error); }
});

/** GET /api/suppliers/:id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    const supplier = await prisma.supplier.findUnique({
      where: { id: p.id },
      include: {
        items: { where: { deletedAt: null }, take: 50, select: { id: true, name: true, quantity: true } },
        procurements: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!supplier) { sendError(res, 'Supplier not found', 404); return; }
    sendSuccess(res, supplier);
  } catch (error) { next(error); }
});

/** POST /api/suppliers */
router.post('/', validate(createSupplierSchema), auditLog('Supplier'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    sendCreated(res, supplier, 'Supplier created');
  } catch (error) { next(error); }
});

/** PATCH /api/suppliers/:id */
router.patch('/:id', validate(createSupplierSchema.partial()), auditLog('Supplier'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    const supplier = await prisma.supplier.update({ where: { id: p.id }, data: req.body });
    sendSuccess(res, supplier, 'Supplier updated');
  } catch (error) { next(error); }
});

/** DELETE /api/suppliers/:id */
router.delete('/:id', authorize('ADMIN'), auditLog('Supplier'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    await prisma.supplier.delete({ where: { id: p.id } });
    sendNoContent(res);
  } catch (error) { next(error); }
});

export default router;

import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditLog } from '../../middleware/auditLog';
import { createCategorySchema, updateCategorySchema } from './inventory.validators';
import { sendSuccess, sendCreated, sendError, sendNoContent, parsePaginationQuery, buildPaginationMeta } from '../../shared/utils/response';

const router = Router();
router.use(authenticate);

/** GET /api/categories — List all categories */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string>;
    const { page, limit, sortBy, sortOrder, search, skip } = parsePaginationQuery(q as Record<string, unknown>);
    const where: any = { deletedAt: null };
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder }, include: { _count: { select: { items: true } } } }),
      prisma.category.count({ where }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    res.json({ success: true, data: categories, meta });
  } catch (error) { next(error); }
});

/** GET /api/categories/:id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    const category = await prisma.category.findUnique({
      where: { id: p.id },
      include: { items: { where: { deletedAt: null }, take: 50 } },
    });
    if (!category) { sendError(res, 'Category not found', 404); return; }
    sendSuccess(res, category);
  } catch (error) { next(error); }
});

/** POST /api/categories */
router.post('/', authorize('ADMIN', 'LIBRARIAN'), validate(createCategorySchema), auditLog('Category'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.category.findUnique({ where: { name: String(req.body.name) } });
    if (existing) { sendError(res, 'Category already exists', 409); return; }

    const category = await prisma.category.create({ data: req.body });
    sendCreated(res, category, 'Category created');
  } catch (error) { next(error); }
});

/** PATCH /api/categories/:id */
router.patch('/:id', authorize('ADMIN', 'LIBRARIAN'), validate(updateCategorySchema), auditLog('Category'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    const category = await prisma.category.update({ where: { id: p.id }, data: req.body });
    sendSuccess(res, category, 'Category updated');
  } catch (error) { next(error); }
});

/** DELETE /api/categories/:id */
router.delete('/:id', authorize('ADMIN'), auditLog('Category'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = req.params as Record<string, string>;
    await prisma.category.delete({ where: { id: p.id } });
    sendNoContent(res);
  } catch (error) { next(error); }
});

export default router;

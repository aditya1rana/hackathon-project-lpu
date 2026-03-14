import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';
import { sendSuccess, sendCreated, sendPaginated, sendError, sendNoContent, parsePaginationQuery, buildPaginationMeta } from '../../shared/utils/response';
import { AuthUser } from '../../shared/types';

/**
 * Inventory Controller — HTTP handlers for inventory item operations.
 */
export class InventoryController {
  /** GET /api/inventory */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder, search, skip } = parsePaginationQuery(req.query as Record<string, unknown>);
      const q = req.query as Record<string, string>;
      const categoryId = q.categoryId || undefined;
      const location = q.location || undefined;
      const lowStock = q.lowStock === 'true';

      const result = await inventoryService.listItems({ skip, limit, sortBy, sortOrder, search, categoryId, location, lowStock });
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }

      const meta = buildPaginationMeta(result.data.total, page, limit);
      sendPaginated(res, { data: result.data.items, meta });
    } catch (error) { next(error); }
  }

  /** GET /api/inventory/:id */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.getItem(req.params.id as string);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data);
    } catch (error) { next(error); }
  }

  /** GET /api/inventory/barcode/:barcode */
  async getByBarcode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.getByBarcode(req.params.barcode as string);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data);
    } catch (error) { next(error); }
  }

  /** POST /api/inventory */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.body.categoryId && !req.body.categoryId.includes('-')) {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        let cat = await prisma.category.findFirst({ where: { name: req.body.categoryId } });
        if (!cat) cat = await prisma.category.create({ data: { name: req.body.categoryId } });
        req.body.categoryId = cat.id;
      }
      const result = await inventoryService.createItem(req.body);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendCreated(res, result.data, 'Item created successfully');
    } catch (error) { next(error); }
  }

  /** PATCH /api/inventory/:id */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.updateItem(req.params.id as string, req.body);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data, 'Item updated');
    } catch (error) { next(error); }
  }

  /** DELETE /api/inventory/:id */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.deleteItem(req.params.id as string);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendNoContent(res);
    } catch (error) { next(error); }
  }

  /** POST /api/inventory/:id/adjust-stock */
  async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user as AuthUser | undefined;
      const { quantity, type, notes } = req.body;
      const result = await inventoryService.adjustStock(
        req.params.id as string, quantity, type, user?.id, undefined, notes
      );
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data, 'Stock adjusted');
    } catch (error) { next(error); }
  }

  /** GET /api/inventory/:id/history */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.getStockHistory(req.params.id as string);
      if (result.success) sendSuccess(res, result.data);
      else sendError(res, result.error, result.statusCode);
    } catch (error) { next(error); }
  }

  /** GET /api/inventory/alerts/low-stock */
  async getLowStock(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.getLowStockItems();
      if (result.success) sendSuccess(res, result.data);
      else sendError(res, result.error, result.statusCode);
    } catch (error) { next(error); }
  }

  /** POST /api/inventory/import */
  async importCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'CSV file is required', 400);
        return;
      }
      const categoryId = req.body.categoryId as string;
      if (!categoryId) {
        sendError(res, 'categoryId is required', 400);
        return;
      }
      const result = await inventoryService.importCSV(req.file.buffer, categoryId);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data, 'Import completed');
    } catch (error) { next(error); }
  }
}

export const inventoryController = new InventoryController();

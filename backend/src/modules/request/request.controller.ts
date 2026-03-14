import { Request, Response, NextFunction } from 'express';
import { requestService } from './request.service';
import { sendSuccess, sendCreated, sendPaginated, sendError, parsePaginationQuery, buildPaginationMeta } from '../../shared/utils/response';
import { AuthUser } from '../../shared/types';

/**
 * Request Controller — HTTP handlers for item request workflow.
 */
export class RequestController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as Record<string, string>;
      const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(q as Record<string, unknown>);
      const status = q.status || undefined;
      const userId = q.userId || undefined;
      const itemId = q.itemId || undefined;

      const result = await requestService.listRequests({ skip, limit, sortBy, sortOrder, status, userId, itemId });
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }

      const meta = buildPaginationMeta(result.data.total, page, limit);
      sendPaginated(res, { data: result.data.requests, meta });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const p = req.params as Record<string, string>;
      const result = await requestService.getRequest(p.id);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user as AuthUser;
      const result = await requestService.createRequest(user.id, req.body);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendCreated(res, result.data, 'Request submitted');
    } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const p = req.params as Record<string, string>;
      const user = (req as any).user as AuthUser | undefined;
      const { status, remarks, penaltyAmount, penaltyReason } = req.body;
      const result = await requestService.updateRequestStatus(
        p.id, status, remarks, penaltyAmount, penaltyReason, user?.id
      );
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data, `Request ${status.toLowerCase()}`);
    } catch (error) { next(error); }
  }

  /** Get requests for the current authenticated user */
  async myRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user as AuthUser;
      const q = req.query as Record<string, string>;
      const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(q as Record<string, unknown>);
      const result = await requestService.listRequests({ skip, limit, sortBy, sortOrder, userId: user.id });
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }

      const meta = buildPaginationMeta(result.data.total, page, limit);
      sendPaginated(res, { data: result.data.requests, meta });
    } catch (error) { next(error); }
  }
}

export const requestController = new RequestController();

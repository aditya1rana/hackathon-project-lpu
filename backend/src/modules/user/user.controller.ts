import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { sendSuccess, sendPaginated, sendError, sendNoContent, parsePaginationQuery, buildPaginationMeta } from '../../shared/utils/response';

/**
 * User Controller — Admin-level user management endpoints.
 */
export class UserController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as Record<string, string>;
      const { page, limit, sortBy, sortOrder, search, skip } = parsePaginationQuery(q as Record<string, unknown>);
      const role = q.role || undefined;

      const result = await userService.getAllUsers({ skip, limit, sortBy, sortOrder, search, role });
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }

      const meta = buildPaginationMeta(result.data.total, page, limit);
      sendPaginated(res, { data: result.data.users, meta });
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const p = req.params as Record<string, string>;
      const result = await userService.getUserById(p.id);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const p = req.params as Record<string, string>;
      const result = await userService.updateUser(p.id, req.body);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data, 'User updated');
    } catch (error) { next(error); }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const p = req.params as Record<string, string>;
      const result = await userService.updateUserRole(p.id, req.body.role);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendSuccess(res, result.data, 'Role updated');
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const p = req.params as Record<string, string>;
      const result = await userService.deleteUser(p.id);
      if (!result.success) { sendError(res, result.error, result.statusCode); return; }
      sendNoContent(res);
    } catch (error) { next(error); }
  }
}

export const userController = new UserController();

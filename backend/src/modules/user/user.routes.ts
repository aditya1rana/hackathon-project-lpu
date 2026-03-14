import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { auditLog } from '../../middleware/auditLog';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

/**
 * @route GET /api/users
 * @desc  List all users (Admin/Librarian only)
 * @query page, limit, sortBy, sortOrder, search, role
 */
router.get('/', authorize('ADMIN', 'LIBRARIAN'), userController.getAll);

/**
 * @route GET /api/users/:id
 * @desc  Get user by ID
 */
router.get('/:id', authorize('ADMIN', 'LIBRARIAN'), userController.getById);

/**
 * @route PATCH /api/users/:id
 * @desc  Update user profile
 */
router.patch('/:id', auditLog('User'), userController.update);

/**
 * @route PATCH /api/users/:id/role
 * @desc  Update user role (Admin only)
 */
router.patch('/:id/role', authorize('ADMIN'), auditLog('User'), userController.updateRole);

/**
 * @route DELETE /api/users/:id
 * @desc  Soft delete user (Admin only)
 */
router.delete('/:id', authorize('ADMIN'), auditLog('User'), userController.remove);

export default router;

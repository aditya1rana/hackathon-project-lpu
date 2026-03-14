import { Router } from 'express';
import { requestController } from './request.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditLog } from '../../middleware/auditLog';
import { createRequestSchema, updateRequestStatusSchema } from './request.validators';

const router = Router();
router.use(authenticate);

/**
 * @route GET /api/requests
 * @desc  List all requests (filterable by status, userId, itemId)
 */
router.get('/', authorize('ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT'), requestController.list);

/**
 * @route GET /api/requests/mine
 * @desc  Get current user's requests
 */
router.get('/mine', requestController.myRequests);

/**
 * @route GET /api/requests/:id
 * @desc  Get single request with transactions
 */
router.get('/:id', requestController.getById);

/**
 * @route POST /api/requests
 * @desc  Create a new item request (any authenticated user)
 */
router.post('/', validate(createRequestSchema), auditLog('Request'), requestController.create);

/**
 * @route PATCH /api/requests/:id/status
 * @desc  Update request status (approve, reject, issue, return)
 */
router.patch(
  '/:id/status',
  authorize('ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT'),
  validate(updateRequestStatusSchema),
  auditLog('Request'),
  requestController.updateStatus
);

export default router;

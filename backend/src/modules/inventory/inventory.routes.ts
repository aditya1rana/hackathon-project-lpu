import { Router } from 'express';
import multer from 'multer';
import { inventoryController } from './inventory.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditLog } from '../../middleware/auditLog';
import { createItemSchema, updateItemSchema } from './inventory.validators';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/inventory
 * @desc  List inventory items with pagination, search, filtering
 * @query page, limit, sortBy, sortOrder, search, categoryId, location, lowStock
 */
router.get('/', inventoryController.list);

/**
 * @route GET /api/inventory/alerts/low-stock
 * @desc  Get items below minimum stock level
 */
router.get('/alerts/low-stock', authorize('ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT'), inventoryController.getLowStock);

/**
 * @route GET /api/inventory/barcode/:barcode
 * @desc  Find item by barcode scan
 */
router.get('/barcode/:barcode', inventoryController.getByBarcode);

/**
 * @route GET /api/inventory/:id
 * @desc  Get single item with transactions and usage history
 */
router.get('/:id', inventoryController.getById);

/**
 * @route GET /api/inventory/:id/history
 * @desc  Get stock transaction history for an item
 */
router.get('/:id/history', inventoryController.getHistory);

/**
 * @route POST /api/inventory
 * @desc  Create a new inventory item
 */
router.post('/', authorize('ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT'), validate(createItemSchema), auditLog('InventoryItem'), inventoryController.create);

/**
 * @route POST /api/inventory/import
 * @desc  Bulk import inventory items from CSV
 */
router.post('/import', authorize('ADMIN', 'LIBRARIAN'), upload.single('file'), auditLog('InventoryItem'), inventoryController.importCSV);

/**
 * @route POST /api/inventory/:id/adjust-stock
 * @desc  Manually adjust stock (restock, write-off, etc)
 */
router.post('/:id/adjust-stock', authorize('ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT'), auditLog('InventoryItem'), inventoryController.adjustStock);

/**
 * @route PATCH/PUT /api/inventory/:id
 * @desc  Update inventory item details
 */
router.patch('/:id', authorize('ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT'), validate(updateItemSchema), auditLog('InventoryItem'), inventoryController.update);
router.put('/:id', authorize('ADMIN', 'LIBRARIAN', 'LAB_ASSISTANT'), validate(updateItemSchema), auditLog('InventoryItem'), inventoryController.update);

/**
 * @route DELETE /api/inventory/:id
 * @desc  Soft delete an inventory item
 */
router.delete('/:id', authorize('ADMIN'), auditLog('InventoryItem'), inventoryController.remove);

export default router;

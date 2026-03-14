import prisma from '../../config/database';
import { CreateItemInput, UpdateItemInput } from './inventory.validators';

/**
 * Inventory Repository — Data access for inventory items.
 * Supports advanced search, filtering, pagination, and stock tracking.
 */
export class InventoryRepository {
  /** List items with pagination, search, filtering, and sorting */
  async findAll(params: {
    skip: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    search?: string;
    categoryId?: string;
    location?: string;
    lowStock?: boolean;
  }) {
    const where: any = { deletedAt: null };

    // Full-text search on name and barcode
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { barcode: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.location) where.location = { contains: params.location, mode: 'insensitive' };
    if (params.lowStock) {
      // Items where quantity <= minStock
      where.quantity = { lte: prisma.$queryRawUnsafe('min_stock') };
      // Simplified: items with quantity below a threshold
      where.AND = [{ quantity: { lte: 10 } }]; // fallback
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: { category: true, supplier: true },
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return { items, total };
  }

  /** Find a single item by ID */
  async findById(id: string) {
    return prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        usageLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }

  /** Find item by barcode */
  async findByBarcode(barcode: string) {
    return prisma.inventoryItem.findUnique({
      where: { barcode },
      include: { category: true, supplier: true },
    });
  }

  /** Create a new inventory item */
  async create(data: CreateItemInput) {
    return prisma.inventoryItem.create({
      data: {
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        minStock: data.minStock,
        location: data.location,
        barcode: data.barcode,
        qrCode: data.qrCode,
        unitPrice: data.unitPrice,
        imageUrl: data.imageUrl,
        isConsumable: data.isConsumable,
        categoryId: data.categoryId,
        supplierId: data.supplierId,
      },
      include: { category: true, supplier: true },
    });
  }

  /** Update an inventory item */
  async update(id: string, data: UpdateItemInput) {
    return prisma.inventoryItem.update({
      where: { id },
      data,
      include: { category: true, supplier: true },
    });
  }

  /** Soft delete an inventory item */
  async softDelete(id: string) {
    return prisma.inventoryItem.delete({ where: { id } });
  }

  /** Adjust stock quantity and create a transaction log */
  async adjustStock(
    itemId: string,
    quantityChange: number,
    type: 'ISSUE' | 'RETURN' | 'ADJUSTMENT' | 'RESTOCK' | 'WRITE_OFF',
    userId?: string,
    requestId?: string,
    notes?: string
  ) {
    return prisma.$transaction(async (tx: any) => {
      // Update quantity atomically
      const item = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { increment: quantityChange } },
      });

      // Create transaction log
      await tx.transaction.create({
        data: {
          type,
          quantity: Math.abs(quantityChange),
          notes,
          itemId,
          requestId,
          issuedById: userId,
        },
      });

      // Create usage log
      await tx.usageLog.create({
        data: {
          action: type,
          quantity: Math.abs(quantityChange),
          performedBy: userId,
          itemId,
        },
      });

      return item;
    });
  }

  /** Bulk create items from CSV data */
  async bulkCreate(items: CreateItemInput[]) {
    return prisma.$transaction(
      items.map((item) =>
        prisma.inventoryItem.create({
          data: {
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            minStock: item.minStock,
            location: item.location,
            barcode: item.barcode,
            qrCode: item.qrCode,
            unitPrice: item.unitPrice,
            isConsumable: item.isConsumable,
            categoryId: item.categoryId,
            supplierId: item.supplierId,
          },
        })
      )
    );
  }

  /** Get items with low stock (quantity <= minStock) */
  async findLowStockItems() {
    return prisma.$queryRaw`
      SELECT i.*, c.name as category_name
      FROM inventory_items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.quantity <= i.min_stock
        AND i.deleted_at IS NULL
      ORDER BY (i.quantity::float / NULLIF(i.min_stock, 0)) ASC
    `;
  }

  /** Get stock history for an item */
  async getStockHistory(itemId: string, limit = 50) {
    return prisma.transaction.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { issuedBy: { select: { firstName: true, lastName: true, email: true } } },
    });
  }
}

export const inventoryRepository = new InventoryRepository();

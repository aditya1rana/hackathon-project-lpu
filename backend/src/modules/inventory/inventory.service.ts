import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { inventoryRepository } from './inventory.repository';
import { CreateItemInput, UpdateItemInput } from './inventory.validators';
import { ServiceResult } from '../../shared/types';
import { cache } from '../../config/redis';

/**
 * Inventory Service — Business logic for inventory management.
 * Includes caching, CSV import, and stock management.
 */
export class InventoryService {
  private readonly CACHE_PREFIX = 'inventory:';
  private readonly CACHE_TTL = 300; // 5 minutes

  // ─── List Items ───────────────────────────────────────────

  async listItems(params: {
    skip: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    search?: string;
    categoryId?: string;
    location?: string;
    lowStock?: boolean;
  }): Promise<ServiceResult<{ items: any[]; total: number }>> {
    const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify(params)}`;
    const cached = await cache.get<{ items: any[]; total: number }>(cacheKey);
    if (cached) return { success: true, data: cached };

    const result = await inventoryRepository.findAll(params);
    await cache.set(cacheKey, result, this.CACHE_TTL);
    return { success: true, data: result };
  }

  // ─── Get Single Item ──────────────────────────────────────

  async getItem(id: string): Promise<ServiceResult<any>> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return { success: true, data: cached };

    const item = await inventoryRepository.findById(id);
    if (!item) return { success: false, error: 'Item not found', statusCode: 404 };

    await cache.set(cacheKey, item, this.CACHE_TTL);
    return { success: true, data: item };
  }

  // ─── Scan by Barcode ──────────────────────────────────────

  async getByBarcode(barcode: string): Promise<ServiceResult<any>> {
    const item = await inventoryRepository.findByBarcode(barcode);
    if (!item) return { success: false, error: 'Item not found', statusCode: 404 };
    return { success: true, data: item };
  }

  // ─── Create Item ──────────────────────────────────────────

  async createItem(data: CreateItemInput): Promise<ServiceResult<any>> {
    if (data.barcode) {
      const existing = await inventoryRepository.findByBarcode(data.barcode);
      if (existing) return { success: false, error: 'Barcode already exists', statusCode: 409 };
    }

    const item = await inventoryRepository.create(data);
    await this.invalidateListCache();
    return { success: true, data: item };
  }

  // ─── Update Item ──────────────────────────────────────────

  async updateItem(id: string, data: UpdateItemInput): Promise<ServiceResult<any>> {
    const existing = await inventoryRepository.findById(id);
    if (!existing) return { success: false, error: 'Item not found', statusCode: 404 };

    const item = await inventoryRepository.update(id, data);
    await cache.del(`${this.CACHE_PREFIX}${id}`);
    await this.invalidateListCache();
    return { success: true, data: item };
  }

  // ─── Delete Item ──────────────────────────────────────────

  async deleteItem(id: string): Promise<ServiceResult<null>> {
    const existing = await inventoryRepository.findById(id);
    if (!existing) return { success: false, error: 'Item not found', statusCode: 404 };

    await inventoryRepository.softDelete(id);
    await cache.del(`${this.CACHE_PREFIX}${id}`);
    await this.invalidateListCache();
    return { success: true, data: null };
  }

  // ─── Stock Operations ────────────────────────────────────

  async adjustStock(
    itemId: string,
    quantityChange: number,
    type: 'ISSUE' | 'RETURN' | 'ADJUSTMENT' | 'RESTOCK' | 'WRITE_OFF',
    userId?: string,
    requestId?: string,
    notes?: string
  ): Promise<ServiceResult<any>> {
    const item = await inventoryRepository.findById(itemId);
    if (!item) return { success: false, error: 'Item not found', statusCode: 404 };

    // Prevent negative stock for issues
    if (type === 'ISSUE' && item.quantity + quantityChange < 0) {
      return { success: false, error: 'Insufficient stock', statusCode: 400 };
    }

    const updated = await inventoryRepository.adjustStock(
      itemId, quantityChange, type, userId, requestId, notes
    );
    await cache.del(`${this.CACHE_PREFIX}${itemId}`);
    await this.invalidateListCache();
    return { success: true, data: updated };
  }

  // ─── Stock History ────────────────────────────────────────

  async getStockHistory(itemId: string): Promise<ServiceResult<any>> {
    const history = await inventoryRepository.getStockHistory(itemId);
    return { success: true, data: history };
  }

  // ─── Low Stock Items ──────────────────────────────────────

  async getLowStockItems(): Promise<ServiceResult<any>> {
    const cacheKey = `${this.CACHE_PREFIX}low-stock`;
    const cached = await cache.get(cacheKey);
    if (cached) return { success: true, data: cached };

    const items = await inventoryRepository.findLowStockItems();
    await cache.set(cacheKey, items, 60); // Short TTL for freshness
    return { success: true, data: items };
  }

  // ─── Bulk CSV Import ──────────────────────────────────────

  async importCSV(fileBuffer: Buffer, categoryId: string): Promise<ServiceResult<{ imported: number; errors: string[] }>> {
    return new Promise((resolve) => {
      const items: CreateItemInput[] = [];
      const errors: string[] = [];
      let rowIndex = 0;

      const stream = Readable.from(fileBuffer.toString());

      stream
        .pipe(csvParser())
        .on('data', (row: any) => {
          rowIndex++;
          try {
            items.push({
              name: row.name || row.Name,
              description: row.description || row.Description || undefined,
              quantity: parseInt(row.quantity || row.Quantity || '0', 10),
              minStock: parseInt(row.minStock || row.min_stock || row.MinStock || '0', 10),
              location: row.location || row.Location || undefined,
              barcode: row.barcode || row.Barcode || undefined,
              qrCode: row.qrCode || row.qr_code || undefined,
              unitPrice: parseFloat(row.unitPrice || row.unit_price || row.Price || '0'),
              isConsumable: row.isConsumable === 'true' || row.isConsumable === '1',
              categoryId,
            });
          } catch (err: any) {
            errors.push(`Row ${rowIndex}: ${err.message}`);
          }
        })
        .on('end', async () => {
          try {
            if (items.length > 0) {
              await inventoryRepository.bulkCreate(items);
            }
            await this.invalidateListCache();
            resolve({
              success: true,
              data: { imported: items.length, errors },
            });
          } catch (err: any) {
            resolve({
              success: false,
              error: `Import failed: ${err.message}`,
              statusCode: 400,
            });
          }
        })
        .on('error', (err) => {
          resolve({
            success: false,
            error: `CSV parsing error: ${err.message}`,
            statusCode: 400,
          });
        });
    });
  }

  // ─── Cache Helpers ────────────────────────────────────────

  private async invalidateListCache() {
    await cache.delPattern(`${this.CACHE_PREFIX}list:*`);
    await cache.del(`${this.CACHE_PREFIX}low-stock`);
  }
}

export const inventoryService = new InventoryService();

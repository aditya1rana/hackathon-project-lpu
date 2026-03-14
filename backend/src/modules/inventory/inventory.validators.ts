import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  location: z.string().optional(),
  barcode: z.string().optional(),
  qrCode: z.string().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  isConsumable: z.boolean().optional().default(false),
  categoryId: z.string().min(1, 'Category is required'),
  supplierId: z.string().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

import { z } from 'zod';

export const createRequestSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  purpose: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateRequestStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'ISSUED', 'RETURNED', 'CANCELLED']),
  remarks: z.string().optional(),
  penaltyAmount: z.coerce.number().min(0).optional(),
  penaltyReason: z.string().optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;

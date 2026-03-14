import { RequestStatus } from '@prisma/client';
import { requestRepository } from './request.repository';
import { inventoryService } from '../inventory/inventory.service';
import { ServiceResult } from '../../shared/types';
import { emitToUser } from '../../config/socket';

/** Valid state transitions for the request workflow */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['ISSUED', 'CANCELLED'],
  REJECTED: [],
  ISSUED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
};

/**
 * Request Service — Business logic for the item request workflow.
 * Enforces state machine transitions and integrates with inventory stock.
 */
export class RequestService {
  async listRequests(params: {
    skip: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    status?: string;
    userId?: string;
    itemId?: string;
  }): Promise<ServiceResult<{ requests: any[]; total: number }>> {
    const result = await requestRepository.findAll({
      ...params,
      status: params.status as RequestStatus | undefined,
    });
    return { success: true, data: result };
  }

  async getRequest(id: string): Promise<ServiceResult<any>> {
    const request = await requestRepository.findById(id);
    if (!request) return { success: false, error: 'Request not found', statusCode: 404 };
    return { success: true, data: request };
  }

  /** Creates a new item request (initiated by any user) */
  async createRequest(userId: string, data: {
    itemId: string;
    quantity: number;
    purpose?: string;
    dueDate?: string;
  }): Promise<ServiceResult<any>> {
    // Verify item exists and has sufficient stock
    const itemResult = await inventoryService.getItem(data.itemId);
    if (!itemResult.success) return itemResult;

    if (itemResult.data.quantity < data.quantity) {
      return { success: false, error: `Insufficient stock. Available: ${itemResult.data.quantity}`, statusCode: 400 };
    }

    const request = await requestRepository.create({ userId, ...data });

    // Notify admins/librarians about new request
    emitToUser(userId, 'request:created', request);

    return { success: true, data: request };
  }

  /** Update request status with state machine validation */
  async updateRequestStatus(
    requestId: string,
    newStatus: string,
    remarks?: string,
    penaltyAmount?: number,
    penaltyReason?: string,
    issuedByUserId?: string
  ): Promise<ServiceResult<any>> {
    const request = await requestRepository.findById(requestId);
    if (!request) return { success: false, error: 'Request not found', statusCode: 404 };

    // Validate state transition
    const allowed = VALID_TRANSITIONS[request.status] || [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${request.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
        statusCode: 400,
      };
    }

    // Handle inventory side-effects on status change
    if (newStatus === 'ISSUED') {
      // Deduct stock
      const stockResult = await inventoryService.adjustStock(
        request.itemId, -request.quantity, 'ISSUE', issuedByUserId, requestId
      );
      if (!stockResult.success) return stockResult;
    }

    if (newStatus === 'RETURNED') {
      // Restore stock
      await inventoryService.adjustStock(
        request.itemId, request.quantity, 'RETURN', issuedByUserId, requestId
      );

      // Calculate penalty for late returns
      if (request.dueDate && new Date() > request.dueDate) {
        const daysLate = Math.ceil((Date.now() - request.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const autopenalty = daysLate * 10; // ₹10 per day
        penaltyAmount = penaltyAmount || autopenalty;
        penaltyReason = penaltyReason || `Late return by ${daysLate} day(s)`;
      }
    }

    const updated = await requestRepository.updateStatus(requestId, {
      status: newStatus as RequestStatus,
      remarks,
      penaltyAmount,
      penaltyReason,
    });

    // Realtime notification to the requester
    emitToUser(request.userId, 'request:updated', {
      requestId,
      status: newStatus,
      message: `Your request for ${request.item.name} has been ${newStatus.toLowerCase()}`,
    });

    return { success: true, data: updated };
  }
}

export const requestService = new RequestService();

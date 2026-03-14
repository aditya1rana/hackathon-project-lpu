import prisma from '../../config/database';
import { RequestStatus } from '@prisma/client';

/**
 * Request Repository — Data access for item request workflow.
 */
export class RequestRepository {
  async findAll(params: {
    skip: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    status?: RequestStatus;
    userId?: string;
    itemId?: string;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.userId) where.userId = params.userId;
    if (params.itemId) where.itemId = params.itemId;

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, department: true } },
          item: { select: { id: true, name: true, quantity: true, location: true } },
        },
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
      }),
      prisma.request.count({ where }),
    ]);

    return { requests, total };
  }

  async findById(id: string) {
    return prisma.request.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, department: true } },
        item: true,
        transactions: true,
      },
    });
  }

  async create(data: { userId: string; itemId: string; quantity: number; purpose?: string; dueDate?: string }) {
    return prisma.request.create({
      data: {
        userId: data.userId,
        itemId: data.itemId,
        quantity: data.quantity,
        purpose: data.purpose,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        item: { select: { id: true, name: true, quantity: true } },
      },
    });
  }

  async updateStatus(
    id: string,
    data: {
      status: RequestStatus;
      remarks?: string;
      penaltyAmount?: number;
      penaltyReason?: string;
    }
  ) {
    const updateData: any = {
      status: data.status,
      remarks: data.remarks,
    };

    // Set timestamps based on status
    if (data.status === 'APPROVED') updateData.approvedAt = new Date();
    if (data.status === 'REJECTED') updateData.rejectedAt = new Date();
    if (data.status === 'ISSUED') updateData.issuedAt = new Date();
    if (data.status === 'RETURNED') {
      updateData.returnedAt = new Date();
      if (data.penaltyAmount) {
        updateData.penaltyAmount = data.penaltyAmount;
        updateData.penaltyReason = data.penaltyReason;
      }
    }

    return prisma.request.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        item: true,
      },
    });
  }
}

export const requestRepository = new RequestRepository();

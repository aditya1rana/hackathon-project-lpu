import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { PaginatedResponse, ApiResponse } from '../types';

/**
 * Standardized response helpers for consistent API responses.
 */
export function sendSuccess<T>(res: Response, data: T, message = 'Success', statusCode = StatusCodes.OK): void {
  const response: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): void {
  sendSuccess(res, data, message, StatusCodes.CREATED);
}

export function sendPaginated<T>(res: Response, result: PaginatedResponse<T>, message = 'Success'): void {
  res.status(StatusCodes.OK).json({ success: true, message, ...result });
}

export function sendError(res: Response, message: string, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errors?: Record<string, string[]>): void {
  const response: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(response);
}

export function sendNoContent(res: Response): void {
  res.status(StatusCodes.NO_CONTENT).send();
}

/**
 * Build pagination meta object from query params and total count.
 */
export function buildPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Parse pagination params from query string with defaults.
 */
export function parsePaginationQuery(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sortBy = (query.sortBy as string) || 'createdAt';
  const sortOrder = (query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
  const search = (query.search as string) || undefined;
  return { page, limit, sortBy, sortOrder: sortOrder as 'asc' | 'desc', search, skip: (page - 1) * limit };
}

/**
 * Safely extract a string query parameter (handles string | string[] | undefined).
 */
export function qs(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value as string | undefined;
}

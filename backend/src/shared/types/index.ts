import { Request } from 'express';

// ─── Authenticated Request ────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

/**
 * Extend the Express Request type to include our AuthUser.
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ─── Pagination ───────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── API Response ─────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// ─── Service Result ───────────────────────────────────────
export type ServiceResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; statusCode?: number };

// ─── Augment Express ──────────────────────────────────────
// Resolve User type conflict and query param typing
declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      query: { [key: string]: string };
    }
  }
}

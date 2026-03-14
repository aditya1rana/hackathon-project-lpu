import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendCreated, sendError } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/types';

/**
 * Auth Controller — HTTP request handlers for all authentication endpoints.
 */
export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.signup(req.body);
      if (!result.success) {
        sendError(res, result.error, result.statusCode);
        return;
      }
      sendCreated(res, result.data, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      if (!result.success) {
        sendError(res, result.error, result.statusCode);
        return;
      }
      sendSuccess(res, result.data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      if (!result.success) {
        sendError(res, result.error, result.statusCode);
        return;
      }
      sendSuccess(res, result.data, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.forgotPassword(req.body.email);
      if (!result.success) {
        sendError(res, result.error, result.statusCode);
        return;
      }
      sendSuccess(res, result.data);
    } catch (error) {
      next(error);
    }
  }

  async verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, code, purpose } = req.body;
      const result = await authService.verifyOTP(email, code, purpose);
      if (!result.success) {
        sendError(res, result.error, result.statusCode);
        return;
      }
      sendSuccess(res, result.data, 'OTP verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resetPassword(req.body);
      if (!result.success) {
        sendError(res, result.error, result.statusCode);
        return;
      }
      sendSuccess(res, result.data, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, req.user, 'Current user');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

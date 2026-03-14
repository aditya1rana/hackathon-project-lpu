import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { authRepository } from './auth.repository';
import { SignupInput, LoginInput, ResetPasswordInput } from './auth.validators';
import { ServiceResult, AuthUser } from '../../shared/types';
import { RoleName } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

/**
 * Auth Service — Business logic for authentication operations.
 * Handles password hashing, JWT token generation, OTP creation,
 * and Google OAuth user provisioning.
 */
export class AuthService {
  // ─── Signup ───────────────────────────────────────────────

  async signup(data: SignupInput): Promise<ServiceResult<{ user: any; accessToken: string; refreshToken: string }>> {
    // Check if user already exists
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) {
      return { success: false, error: 'Email already registered', statusCode: 409 };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const user = await authRepository.createUser({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      department: data.department,
      phone: data.phone,
      roleName: (data.role as RoleName) || 'STUDENT',
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        ...tokens,
      },
    };
  }

  // ─── Login ────────────────────────────────────────────────

  async login(data: LoginInput): Promise<ServiceResult<{ user: any; accessToken: string; refreshToken: string }>> {
    const user = await authRepository.findUserByEmail(data.email);
    if (!user || !user.passwordHash) {
      return { success: false, error: 'Invalid credentials', statusCode: 401 };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated', statusCode: 403 };
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid credentials', statusCode: 401 };
    }

    // Update last login
    await authRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        ...tokens,
      },
    };
  }

  // ─── Refresh Token ────────────────────────────────────────

  async refreshAccessToken(refreshToken: string): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
    const stored = await authRepository.findRefreshToken(refreshToken);
    if (!stored) {
      return { success: false, error: 'Invalid refresh token', statusCode: 401 };
    }

    if (stored.expiresAt < new Date()) {
      await authRepository.deleteRefreshToken(refreshToken);
      return { success: false, error: 'Refresh token expired', statusCode: 401 };
    }

    // Rotate: delete old, create new
    await authRepository.deleteRefreshToken(refreshToken);
    const tokens = await this.generateTokens(stored.user);

    return { success: true, data: tokens };
  }

  // ─── Logout ───────────────────────────────────────────────

  async logout(refreshToken: string): Promise<ServiceResult<null>> {
    await authRepository.deleteRefreshToken(refreshToken).catch(() => {});
    return { success: true, data: null, message: 'Logged out successfully' };
  }

  // ─── Google OAuth ─────────────────────────────────────────

  async googleOAuth(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }): Promise<ServiceResult<{ user: any; accessToken: string; refreshToken: string }>> {
    // Check if user exists by Google ID
    let user = await authRepository.findUserByGoogleId(profile.googleId);

    if (!user) {
      // Check if email already exists (link accounts)
      user = await authRepository.findUserByEmail(profile.email);

      if (!user) {
        // Create new user
        user = await authRepository.createUser({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          googleId: profile.googleId,
          roleName: 'STUDENT',
        });
      }
    }

    await authRepository.updateLastLogin(user.id);
    const tokens = await this.generateTokens(user);

    return {
      success: true,
      data: {
        user: this.sanitizeUser(user),
        ...tokens,
      },
    };
  }

  // ─── Forgot Password ─────────────────────────────────────

  async forgotPassword(email: string): Promise<ServiceResult<{ message: string }>> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return { success: true, data: { message: 'If the email exists, an OTP has been sent' } };
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await authRepository.createOTP(user.id, code, 'PASSWORD_RESET', expiresAt);

    // TODO: Send email with OTP (uses notification service)
    // For now, log it in development
    if (env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset OTP for ${email}: ${code}`);
    }

    return { success: true, data: { message: 'If the email exists, an OTP has been sent' } };
  }

  // ─── Verify OTP ───────────────────────────────────────────

  async verifyOTP(email: string, code: string, purpose: string): Promise<ServiceResult<{ verified: boolean }>> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid OTP', statusCode: 400 };
    }

    const otp = await authRepository.findValidOTP(user.id, code, purpose);
    if (!otp) {
      return { success: false, error: 'Invalid or expired OTP', statusCode: 400 };
    }

    await authRepository.markOTPUsed(otp.id);
    return { success: true, data: { verified: true } };
  }

  // ─── Reset Password ──────────────────────────────────────

  async resetPassword(data: ResetPasswordInput): Promise<ServiceResult<{ message: string }>> {
    const user = await authRepository.findUserByEmail(data.email);
    if (!user) {
      return { success: false, error: 'User not found', statusCode: 404 };
    }

    // Verify OTP first
    const otp = await authRepository.findValidOTP(user.id, data.code, 'PASSWORD_RESET');
    if (!otp) {
      return { success: false, error: 'Invalid or expired OTP', statusCode: 400 };
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
    await authRepository.updatePassword(user.id, passwordHash);
    await authRepository.markOTPUsed(otp.id);

    // Invalidate all refresh tokens (force re-login everywhere)
    await authRepository.deleteAllUserRefreshTokens(user.id);

    return { success: true, data: { message: 'Password reset successfully' } };
  }

  // ─── Helpers ──────────────────────────────────────────────

  /** Generate both access and refresh tokens */
  private async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: this.parseExpiry(env.JWT_ACCESS_EXPIRY) / 1000, // seconds
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() + this.parseExpiry(env.JWT_REFRESH_EXPIRY)
    );

    await authRepository.createRefreshToken(user.id, refreshToken, refreshExpiresAt);

    return { accessToken, refreshToken };
  }

  /** Parse expiry strings like '7d', '15m', '1h' into milliseconds */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] || 1000);
  }

  /** Remove sensitive fields from user object */
  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export const authService = new AuthService();

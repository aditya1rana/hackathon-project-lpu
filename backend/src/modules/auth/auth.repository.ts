import prisma from '../../config/database';
import { RoleName } from '@prisma/client';

/**
 * Auth Repository — Data access layer for authentication operations.
 * All Prisma queries are encapsulated here for testability.
 */
export class AuthRepository {
  /** Find a user by email (including soft-deleted check handled by Prisma middleware) */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  /** Find a user by their ID */
  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  /** Find a user by Google ID */
  async findUserByGoogleId(googleId: string) {
    return prisma.user.findUnique({
      where: { googleId },
      include: { role: true },
    });
  }

  /** Create a new user */
  async createUser(data: {
    email: string;
    passwordHash?: string;
    firstName: string;
    lastName: string;
    department?: string;
    phone?: string;
    googleId?: string;
    roleName: RoleName;
  }) {
    // Find or create the role
    const role = await prisma.role.upsert({
      where: { name: data.roleName },
      update: {},
      create: { name: data.roleName, description: `${data.roleName} role` },
    });

    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        department: data.department,
        phone: data.phone,
        googleId: data.googleId,
        roleId: role.id,
      },
      include: { role: true },
    });
  }

  /** Update user's last login timestamp */
  async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /** Update user password hash */
  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // ─── Refresh Token Operations ─────────────────────────────

  /** Store a refresh token */
  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  /** Find a refresh token */
  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { role: true } } },
    });
  }

  /** Delete a refresh token */
  async deleteRefreshToken(token: string) {
    return prisma.refreshToken.delete({
      where: { token },
    });
  }

  /** Delete all refresh tokens for a user */
  async deleteAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // ─── OTP Operations ──────────────────────────────────────

  /** Create an OTP code */
  async createOTP(userId: string, code: string, purpose: string, expiresAt: Date) {
    // Invalidate existing OTPs for this user/purpose
    await prisma.oTP.updateMany({
      where: { userId, purpose, used: false },
      data: { used: true },
    });

    return prisma.oTP.create({
      data: { userId, code, purpose, expiresAt },
    });
  }

  /** Find a valid OTP */
  async findValidOTP(userId: string, code: string, purpose: string) {
    return prisma.oTP.findFirst({
      where: {
        userId,
        code,
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /** Mark OTP as used */
  async markOTPUsed(id: string) {
    return prisma.oTP.update({
      where: { id },
      data: { used: true },
    });
  }
}

export const authRepository = new AuthRepository();

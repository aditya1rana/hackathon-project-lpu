import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from './auth.validators';

const router = Router();

/**
 * @route POST /api/auth/signup
 * @desc  Register a new user
 */
router.post('/signup', validate(signupSchema), authController.signup);

/**
 * @route POST /api/auth/login
 * @desc  Login with email/password
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route POST /api/auth/refresh
 * @desc  Refresh access token using refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc  Invalidate refresh token
 */
router.post('/logout', authController.logout);

/**
 * @route POST /api/auth/forgot-password
 * @desc  Send OTP for password reset
 */
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @route POST /api/auth/verify-otp
 * @desc  Verify an OTP code
 */
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOTP);

/**
 * @route POST /api/auth/reset-password
 * @desc  Reset password using verified OTP
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/**
 * @route GET /api/auth/me
 * @desc  Get current authenticated user
 */
router.get('/me', authenticate, authController.me);

export default router;

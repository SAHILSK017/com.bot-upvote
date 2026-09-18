import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

/**
 * POST /api/auth/signup
 */
export const signupSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email: z.string().trim().email('Valid email is required').max(255),
    password: passwordSchema,
  })
  .strict();

/**
 * POST /api/auth/login
 */
export const loginSchema = z
  .object({
    email: z.string().trim().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

/**
 * GET /api/auth/verify-email/:token
 */
export const verifyEmailParamsSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
  })
  .strict();

/**
 * POST /api/auth/forgot-password
 */
export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email('Valid email is required'),
  })
  .strict();

/**
 * POST /api/auth/reset-password
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: passwordSchema,
  })
  .strict();

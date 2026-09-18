import { Router } from 'express';
import {
  signup,
  login,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  me,
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  signupSchema,
  loginSchema,
  verifyEmailParamsSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validators.js';
import { emptyBodySchema } from '../validators/common.validators.js';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(emptyBodySchema), refresh);
router.post('/logout', validate(emptyBodySchema), logout);
router.get('/verify-email/:token', validate(verifyEmailParamsSchema, 'params'), verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', requireAuth, me);

export default router;

import { AppError } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/token.utils.js';
import { USER_ROLES } from '../utils/constants.js';
import { User } from '../models/User.js';

/**
 * Verifies Bearer access token and attaches `req.user` from the database
 * (role is never trusted from the JWT alone).
 * @type {import('express').RequestHandler}
 */
export function requireAuth(req, _res, next) {
  (async () => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    let payload;
    try {
      payload = verifyAccessToken(header.slice(7));
    } catch {
      throw new AppError('Invalid or expired access token', 401);
    }

    if (!payload?.sub) {
      throw new AppError('Invalid or expired access token', 401);
    }

    const user = await User.findById(payload.sub).select('_id role name email');
    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };
    next();
  })().catch((err) => {
    if (err instanceof AppError) return next(err);
    return next(new AppError('Invalid or expired access token', 401));
  });
}

/**
 * Optionally attaches `req.user` from DB when a valid Bearer token is present.
 * Invalid tokens are ignored (request continues as guest).
 * @type {import('express').RequestHandler}
 */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  (async () => {
    try {
      const payload = verifyAccessToken(header.slice(7));
      if (!payload?.sub) return;
      const user = await User.findById(payload.sub).select('_id role name email');
      if (user) {
        req.user = {
          id: user._id.toString(),
          role: user.role,
          name: user.name,
          email: user.email,
        };
      }
    } catch {
      // Guest browse — ignore bad/expired tokens on public routes
    }
  })()
    .then(() => next())
    .catch(() => next());
}

/**
 * Requires the authenticated user to have the admin role (from DB via requireAuth).
 * Must run after `requireAuth`.
 * @type {import('express').RequestHandler}
 */
export function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  if (req.user.role !== USER_ROLES.ADMIN) {
    return next(new AppError('Admin access required', 403));
  }
  return next();
}

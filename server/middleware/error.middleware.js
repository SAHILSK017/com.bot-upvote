import { AppError, sendError } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

/**
 * Centralized Express error handler — keeps response shape consistent.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorMiddleware(err, _req, res, _next) {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  if (err.name === 'ZodError') {
    const errors = err.issues?.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, 'Validation failed', 400, errors);
  }

  if (err.name === 'CastError') {
    return sendError(res, 'Invalid resource id', 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return sendError(res, `Duplicate value for ${field}`, 409);
  }

  console.error('[error]', err);
  return sendError(
    res,
    env.isProd ? 'Internal server error' : err.message || 'Internal server error',
    500
  );
}

/**
 * 404 handler for unknown API routes.
 * @type {import('express').RequestHandler}
 */
export function notFoundMiddleware(req, res) {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

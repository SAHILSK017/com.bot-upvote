import { AppError } from '../utils/asyncHandler.js';

/**
 * Builds Express middleware that validates req[target] against a Zod schema.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [target='body']
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, target = 'body') {
  return (req, _res, next) => {
    const raw = target === 'body' ? (req.body ?? {}) : req[target];
    const result = schema.safeParse(raw);
    if (!result.success) {
      return next(
        new AppError(
          'Validation failed',
          400,
          result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }))
        )
      );
    }
    req[target] = result.data;
    return next();
  };
}

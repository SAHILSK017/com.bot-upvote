/**
 * Application error with HTTP status and optional field errors.
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode=500]
   * @param {unknown} [errors]
   */
  constructor(message, statusCode = 500, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

/**
 * Wraps an async Express handler so rejected promises reach error middleware.
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} fn
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Sends a consistent success JSON payload.
 * @param {import('express').Response} res
 * @param {unknown} data
 * @param {string} [message='OK']
 * @param {number} [statusCode=200]
 */
export function sendSuccess(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/**
 * Sends a consistent error JSON payload.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=500]
 * @param {unknown} [errors]
 */
export function sendError(res, message, statusCode = 500, errors = undefined) {
  const body = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  return res.status(statusCode).json(body);
}

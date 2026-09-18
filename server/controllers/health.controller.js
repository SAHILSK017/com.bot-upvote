import { env } from '../config/env.js';
import { asyncHandler, sendSuccess } from '../utils/asyncHandler.js';

/**
 * Health check — confirms the API process is up.
 */
export const getHealth = asyncHandler(async (_req, res) => {
  sendSuccess(
    res,
    {
      service: 'feature-roadmap-api',
      env: env.nodeEnv,
    },
    'Service healthy'
  );
});

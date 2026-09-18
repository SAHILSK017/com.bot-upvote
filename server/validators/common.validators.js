import { z } from 'zod';

/** Empty schema for routes that intentionally accept no body. */
export const emptyBodySchema = z.object({}).strict();

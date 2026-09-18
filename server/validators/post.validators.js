import { z } from 'zod';
import {
  POST_CATEGORIES,
  POST_STATUSES,
  POST_SORT,
  PAGINATION,
} from '../utils/constants.js';

const categoryValues = Object.values(POST_CATEGORIES);
const statusValues = Object.values(POST_STATUSES);
const sortValues = Object.values(POST_SORT);

/**
 * POST /api/posts — create a feature request.
 */
export const createPostSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(10000),
    category: z.enum(categoryValues, {
      errorMap: () => ({ message: `Category must be one of: ${categoryValues.join(', ')}` }),
    }),
  })
  .strict();

/**
 * GET /api/posts — list query params.
 */
export const listPostsQuerySchema = z
  .object({
    sort: z.enum(sortValues).optional().default(POST_SORT.NEWEST),
    category: z.enum(categoryValues).optional(),
    status: z.enum(statusValues).optional(),
    search: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION.MAX_LIMIT)
      .optional()
      .default(PAGINATION.DEFAULT_LIMIT),
  })
  .strict();

/**
 * GET /api/posts/:id
 */
export const postIdParamsSchema = z
  .object({
    id: z.string().min(1, 'Post id is required'),
  })
  .strict();

/**
 * POST|DELETE /api/posts/:id/vote
 */
export const voteParamsSchema = postIdParamsSchema;

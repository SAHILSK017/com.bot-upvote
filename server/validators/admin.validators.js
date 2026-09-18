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
 * GET /api/admin/posts query params.
 */
export const adminListPostsQuerySchema = z
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
 * PATCH /api/admin/posts/:id/status
 */
export const updatePostStatusSchema = z
  .object({
    status: z.enum(statusValues, {
      errorMap: () => ({ message: `Status must be one of: ${statusValues.join(', ')}` }),
    }),
  })
  .strict();

/**
 * Admin post id params.
 */
export const adminPostIdParamsSchema = z
  .object({
    id: z.string().min(1, 'Post id is required'),
  })
  .strict();

/**
 * PATCH /api/admin/posts/:id — admin edit post content.
 */
export const updatePostSchema = z
  .object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200).optional(),
    description: z.string().trim().min(10, 'Description must be at least 10 characters').max(10000).optional(),
    category: z.enum(categoryValues).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });


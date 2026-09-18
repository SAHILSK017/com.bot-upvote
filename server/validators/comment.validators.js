import { z } from 'zod';

/**
 * POST /api/posts/:id/comments
 */
export const createCommentSchema = z
  .object({
    content: z.string().trim().min(1, 'Content is required').max(5000),
    parentComment: z.string().min(1).nullable().optional(),
  })
  .strict();

/**
 * PATCH /api/comments/:id
 */
export const updateCommentSchema = z
  .object({
    content: z.string().trim().min(1, 'Content is required').max(5000),
  })
  .strict();

/**
 * Route params with Mongo id-like string.
 */
export const commentIdParamsSchema = z
  .object({
    id: z.string().min(1, 'Comment id is required'),
  })
  .strict();

/**
 * Nested post comments: /api/posts/:id/comments
 */
export const postCommentsParamsSchema = z
  .object({
    id: z.string().min(1, 'Post id is required'),
  })
  .strict();

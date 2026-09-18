import { Router } from 'express';
import {
  createPost,
  listPosts,
  getPostById,
  votePost,
  unvotePost,
} from '../controllers/post.controller.js';
import { listComments, createComment } from '../controllers/comment.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import {
  createPostSchema,
  listPostsQuerySchema,
  postIdParamsSchema,
  voteParamsSchema,
} from '../validators/post.validators.js';
import {
  createCommentSchema,
  postCommentsParamsSchema,
} from '../validators/comment.validators.js';
import { emptyBodySchema } from '../validators/common.validators.js';

const router = Router();

router.get('/', optionalAuth, validate(listPostsQuerySchema, 'query'), listPosts);
router.post('/', requireAuth, validate(createPostSchema), createPost);

router.get(
  '/:id/comments',
  validate(postCommentsParamsSchema, 'params'),
  listComments
);
router.post(
  '/:id/comments',
  requireAuth,
  validate(postCommentsParamsSchema, 'params'),
  validate(createCommentSchema),
  createComment
);

router.post(
  '/:id/vote',
  requireAuth,
  validate(voteParamsSchema, 'params'),
  validate(emptyBodySchema),
  votePost
);
router.delete(
  '/:id/vote',
  requireAuth,
  validate(voteParamsSchema, 'params'),
  validate(emptyBodySchema),
  unvotePost
);

router.get('/:id', optionalAuth, validate(postIdParamsSchema, 'params'), getPostById);

export default router;

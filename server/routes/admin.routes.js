import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  adminPing,
  listAdminPosts,
  updatePostStatus,
  deletePost,
  updatePost,
} from '../controllers/admin.controller.js';
import {
  adminListPostsQuerySchema,
  updatePostStatusSchema,
  adminPostIdParamsSchema,
  updatePostSchema,
} from '../validators/admin.validators.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/ping', adminPing);
router.get('/posts', validate(adminListPostsQuerySchema, 'query'), listAdminPosts);
router.patch(
  '/posts/:id/status',
  validate(adminPostIdParamsSchema, 'params'),
  validate(updatePostStatusSchema),
  updatePostStatus
);
router.patch(
  '/posts/:id',
  validate(adminPostIdParamsSchema, 'params'),
  validate(updatePostSchema),
  updatePost
);
router.delete(
  '/posts/:id',
  validate(adminPostIdParamsSchema, 'params'),
  deletePost
);

export default router;


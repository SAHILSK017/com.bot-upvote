import { Router } from 'express';
import { updateComment, deleteComment } from '../controllers/comment.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  updateCommentSchema,
  commentIdParamsSchema,
} from '../validators/comment.validators.js';

const router = Router();

router.patch(
  '/:id',
  requireAuth,
  validate(commentIdParamsSchema, 'params'),
  validate(updateCommentSchema),
  updateComment
);

router.delete(
  '/:id',
  requireAuth,
  validate(commentIdParamsSchema, 'params'),
  deleteComment
);

export default router;

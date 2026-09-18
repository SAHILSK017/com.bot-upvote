import mongoose from 'mongoose';
import { Comment } from '../models/Comment.js';
import { Post } from '../models/Post.js';
import { AppError, asyncHandler, sendSuccess } from '../utils/asyncHandler.js';
import { USER_ROLES } from '../utils/constants.js';

/**
 * Ensures the requester is the comment author or an admin.
 * @param {import('mongoose').Document} comment
 * @param {{ id: string, role: string }} user
 */
function assertCanModerate(comment, user) {
  const isAuthor = comment.author.toString() === user.id;
  const isAdmin = user.role === USER_ROLES.ADMIN;
  if (!isAuthor && !isAdmin) {
    throw new AppError('Not allowed to modify this comment', 403);
  }
}

/**
 * Lists comments for a post, nesting one level of replies under parents.
 */
export const listComments = asyncHandler(async (req, res) => {
  const { id: postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AppError('Invalid post id', 400);
  }

  const post = await Post.findById(postId).select('_id');
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: 1 })
    .populate('author', 'name email');

  const tops = [];
  /** @type {Map<string, object[]>} */
  const repliesByParent = new Map();

  for (const comment of comments) {
    const json = comment.toPublicJSON();
    if (!comment.parentComment) {
      tops.push({ ...json, replies: [] });
    } else {
      const parentId = comment.parentComment.toString();
      if (!repliesByParent.has(parentId)) repliesByParent.set(parentId, []);
      repliesByParent.get(parentId).push(json);
    }
  }

  for (const top of tops) {
    top.replies = repliesByParent.get(top.id) || [];
  }

  sendSuccess(res, { comments: tops }, 'OK');
});

/**
 * Creates a top-level comment or a single-level reply; bumps post.commentCount.
 */
export const createComment = asyncHandler(async (req, res) => {
  const { id: postId } = req.params;
  const { content, parentComment: parentId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new AppError('Invalid post id', 400);
  }

  const post = await Post.findById(postId).select('_id');
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  let parentComment = null;
  if (parentId) {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      throw new AppError('Invalid parent comment id', 400);
    }
    parentComment = await Comment.findById(parentId);
    if (!parentComment || parentComment.post.toString() !== postId) {
      throw new AppError('Parent comment not found on this post', 404);
    }
    if (parentComment.parentComment) {
      throw new AppError('Only one level of replies is allowed', 400);
    }
  }

  const comment = await Comment.create({
    post: postId,
    author: req.user.id,
    content,
    parentComment: parentComment ? parentComment._id : null,
  });

  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
  await comment.populate('author', 'name email');

  sendSuccess(res, { comment: comment.toPublicJSON() }, 'Comment created', 201);
});

/**
 * Updates comment content (author or admin only).
 */
export const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid comment id', 400);
  }

  const comment = await Comment.findById(id);
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  assertCanModerate(comment, req.user);

  comment.content = content;
  comment.editedAt = new Date();
  await comment.save();
  await comment.populate('author', 'name email');

  sendSuccess(res, { comment: comment.toPublicJSON() }, 'Comment updated');
});

/**
 * Deletes a comment (author or admin). Cascades child replies and adjusts commentCount.
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid comment id', 400);
  }

  const comment = await Comment.findById(id);
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  assertCanModerate(comment, req.user);

  const childIds = await Comment.find({ parentComment: comment._id }).select('_id');
  const deleteCount = 1 + childIds.length;

  await Comment.deleteMany({
    $or: [{ _id: comment._id }, { parentComment: comment._id }],
  });

  await Post.findByIdAndUpdate(comment.post, {
    $inc: { commentCount: -deleteCount },
  });

  // Clamp at 0 if somehow drifted
  await Post.updateOne({ _id: comment.post, commentCount: { $lt: 0 } }, { $set: { commentCount: 0 } });

  sendSuccess(res, { deleted: deleteCount }, 'Comment deleted');
});

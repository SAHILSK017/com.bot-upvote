import mongoose from 'mongoose';
import { Post } from '../models/Post.js';
import { Comment } from '../models/Comment.js';
import { AppError, asyncHandler, sendSuccess } from '../utils/asyncHandler.js';
import { POST_SORT, STATUS_SEQUENCE } from '../utils/constants.js';

/**
 * Builds Mongo sort object from a feed sort mode.
 * @param {string} sort
 * @returns {Record<string, 1 | -1>}
 */
function sortSpec(sort) {
  switch (sort) {
    case POST_SORT.UPVOTED:
      return { voteCount: -1, createdAt: -1 };
    case POST_SORT.DISCUSSED:
      return { commentCount: -1, createdAt: -1 };
    case POST_SORT.NEWEST:
    default:
      return { createdAt: -1 };
  }
}

/**
 * Returns true when `next` is exactly one step forward from `current` in STATUS_SEQUENCE.
 * @param {string} current
 * @param {string} next
 * @returns {boolean}
 */
export function isSequentialStatusChange(current, next) {
  const from = STATUS_SEQUENCE.indexOf(current);
  const to = STATUS_SEQUENCE.indexOf(next);
  if (from === -1 || to === -1) return false;
  return to === from + 1;
}

/**
 * Lightweight admin ping used for RBAC smoke tests.
 */
export const adminPing = asyncHandler(async (_req, res) => {
  sendSuccess(res, { admin: true }, 'Admin access confirmed');
});

/**
 * Admin list of all posts with the same filters as the public feed.
 */
export const listAdminPosts = asyncHandler(async (req, res) => {
  const { sort, category, status, search, page, limit } = req.query;

  /** @type {Record<string, unknown>} */
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * limit;
  const sortObj = sortSpec(sort);

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .select(search ? { score: { $meta: 'textScore' } } : undefined)
      .sort(search ? { score: { $meta: 'textScore' } } : sortObj)
      .skip(skip)
      .limit(limit)
      .populate('author', 'name email'),
    Post.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      posts: posts.map((post) => post.toPublicJSON({ viewerId: req.user.id })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    },
    'OK'
  );
});

/**
 * Updates a post status. Enforces the preferred sequence but allows admin override
 * with an out-of-sequence flag + server log.
 */
export const updatePostStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: nextStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid post id', 400);
  }

  const post = await Post.findById(id);
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const previousStatus = post.status;

  if (previousStatus === nextStatus) {
    await post.populate('author', 'name email');
    return sendSuccess(
      res,
      {
        post: post.toPublicJSON({ viewerId: req.user.id }),
        outOfSequence: false,
        previousStatus,
      },
      'Status unchanged'
    );
  }

  const sequential = isSequentialStatusChange(previousStatus, nextStatus);
  const outOfSequence = !sequential;

  if (outOfSequence) {
    console.warn(
      `[admin] Out-of-sequence status change by user ${req.user.id} on post ${id}: ` +
        `${previousStatus} → ${nextStatus}`
    );
  }

  post.status = nextStatus;
  await post.save();
  await post.populate('author', 'name email');

  sendSuccess(
    res,
    {
      post: post.toPublicJSON({ viewerId: req.user.id }),
      outOfSequence,
      previousStatus,
    },
    outOfSequence
      ? 'Status updated (out-of-sequence override)'
      : 'Status updated'
  );
});

/**
 * Admin deletes a post along with all its comments.
 */
export const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid post id', 400);
  }

  const post = await Post.findById(id);
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // Cascade delete all comments belonging to this post
  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();

  sendSuccess(res, { deleted: true }, 'Post deleted');
});

/**
 * Admin updates a post's title, description, and/or category.
 */
export const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, category } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid post id', 400);
  }

  const post = await Post.findById(id);
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (title !== undefined) post.title = title;
  if (description !== undefined) post.description = description;
  if (category !== undefined) post.category = category;

  await post.save();
  await post.populate('author', 'name email');

  sendSuccess(res, { post: post.toPublicJSON({ viewerId: req.user.id }) }, 'Post updated');
});

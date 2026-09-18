import mongoose from 'mongoose';
import { Post } from '../models/Post.js';
import { AppError, asyncHandler, sendSuccess } from '../utils/asyncHandler.js';
import { POST_SORT } from '../utils/constants.js';

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
 * Creates a new feature request (authenticated).
 */
export const createPost = asyncHandler(async (req, res) => {
  const { title, description, category } = req.body;

  const post = await Post.create({
    title,
    description,
    category,
    author: req.user.id,
  });

  await post.populate('author', 'name email');

  sendSuccess(res, { post: post.toPublicJSON({ viewerId: req.user.id }) }, 'Post created', 201);
});

/**
 * Lists posts with sort, filter, search, and page/limit pagination.
 */
export const listPosts = asyncHandler(async (req, res) => {
  const { sort, category, status, search, page, limit } = req.query;

  /** @type {Record<string, unknown>} */
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    filter.$text = { $search: search };
  }

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

  const viewerId = req.user?.id;
  const data = posts.map((post) => post.toPublicJSON(viewerId ? { viewerId } : {}));

  sendSuccess(
    res,
    {
      posts: data,
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
 * Returns a single post by id.
 */
export const getPostById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid post id', 400);
  }

  const post = await Post.findById(id).populate('author', 'name email');
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  sendSuccess(
    res,
    { post: post.toPublicJSON(req.user?.id ? { viewerId: req.user.id } : {}) },
    'OK'
  );
});

/**
 * Atomically upvotes a post for the current user (single Mongo update).
 * Filter excludes users already in votedBy to prevent duplicate votes under concurrency.
 */
export const votePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid post id', 400);
  }

  const post = await Post.findOneAndUpdate(
    { _id: id, votedBy: { $ne: userId } },
    { $addToSet: { votedBy: userId }, $inc: { voteCount: 1 } },
    { new: true }
  ).populate('author', 'name email');

  if (!post) {
    const existing = await Post.findById(id).select('_id');
    if (!existing) {
      throw new AppError('Post not found', 404);
    }
    throw new AppError('You have already voted for this post', 409);
  }

  sendSuccess(res, { post: post.toPublicJSON({ viewerId: userId }) }, 'Vote recorded');
});

/**
 * Atomically removes the current user's upvote (single Mongo update).
 */
export const unvotePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid post id', 400);
  }

  const post = await Post.findOneAndUpdate(
    { _id: id, votedBy: userId },
    { $pull: { votedBy: userId }, $inc: { voteCount: -1 } },
    { new: true }
  ).populate('author', 'name email');

  if (!post) {
    const existing = await Post.findById(id).select('_id');
    if (!existing) {
      throw new AppError('Post not found', 404);
    }
    throw new AppError('You have not voted for this post', 409);
  }

  sendSuccess(res, { post: post.toPublicJSON({ viewerId: userId }) }, 'Vote removed');
});

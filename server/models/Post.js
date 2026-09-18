import mongoose from 'mongoose';
import { POST_CATEGORIES, POST_STATUSES } from '../utils/constants.js';

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    category: {
      type: String,
      enum: Object.values(POST_CATEGORIES),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(POST_STATUSES),
      default: POST_STATUSES.UNDER_REVIEW,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    votedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    voteCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

postSchema.index({ title: 'text', description: 'text' });
postSchema.index({ status: 1, category: 1 });
postSchema.index({ status: 1, voteCount: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ commentCount: -1 });
postSchema.index({ votedBy: 1 });

/**
 * Returns a public post object for API responses.
 * @param {object} [opts]
 * @param {string} [opts.viewerId] — if set, includes `hasVoted` for that user
 * @returns {object}
 */
postSchema.methods.toPublicJSON = function toPublicJSON(opts = {}) {
  const author =
    this.author && typeof this.author === 'object' && this.author._id
      ? {
          id: this.author._id.toString(),
          name: this.author.name,
          email: this.author.email,
        }
      : { id: this.author?.toString?.() || this.author };

  const votedByIds = (this.votedBy || []).map((id) => id.toString());
  const payload = {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    category: this.category,
    status: this.status,
    author,
    voteCount: this.voteCount,
    commentCount: this.commentCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };

  if (opts.viewerId) {
    payload.hasVoted = votedByIds.includes(opts.viewerId.toString());
  }

  return payload;
};

export const Post = mongoose.model('Post', postSchema);

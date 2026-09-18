import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });

/**
 * Returns a public comment object for API responses.
 * @returns {object}
 */
commentSchema.methods.toPublicJSON = function toPublicJSON() {
  const author =
    this.author && typeof this.author === 'object' && this.author._id
      ? {
          id: this.author._id.toString(),
          name: this.author.name,
          email: this.author.email,
        }
      : { id: this.author?.toString?.() || this.author };

  return {
    id: this._id.toString(),
    post: this.post?.toString?.() || this.post,
    author,
    content: this.content,
    parentComment: this.parentComment ? this.parentComment.toString() : null,
    editedAt: this.editedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Comment = mongoose.model('Comment', commentSchema);

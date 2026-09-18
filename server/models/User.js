import mongoose from 'mongoose';
import { USER_ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshTokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

/**
 * Returns a safe public user object (no password / token fields).
 * @returns {{ id: string, name: string, email: string, role: string, isVerified: boolean, createdAt: Date }}
 */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    isVerified: this.isVerified,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);

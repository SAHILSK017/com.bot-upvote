import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { AppError, asyncHandler, sendSuccess } from '../utils/asyncHandler.js';
import { COOKIE_NAMES } from '../utils/constants.js';
import { env } from '../config/env.js';
import { sendSimulatedEmail } from '../utils/email.utils.js';
import {
  signAccessToken,
  signRefreshToken,
  signEmailVerifyToken,
  signPasswordResetToken,
  verifyRefreshToken,
  verifyEmailVerifyToken,
  verifyPasswordResetToken,
} from '../utils/token.utils.js';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookie.utils.js';

const BCRYPT_ROUNDS = 12;

/**
 * Issues access + refresh tokens and sets the refresh cookie.
 * @param {import('express').Response} res
 * @param {import('mongoose').Document & { _id: import('mongoose').Types.ObjectId, role: string, refreshTokenVersion: number }} user
 * @returns {{ accessToken: string }}
 */
function issueTokenPair(res, user) {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
  });
  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    tokenVersion: user.refreshTokenVersion,
  });
  setRefreshCookie(res, refreshToken);
  return { accessToken };
}

/**
 * Registers a new user and simulates sending an email verification link.
 */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
  });

  const verifyToken = signEmailVerifyToken({ sub: user._id.toString() });
  const verifyLink = `${env.clientUrl}/verify-email?token=${verifyToken}`;

  await sendSimulatedEmail({
    to: user.email,
    subject: 'Verify your email',
    body: `Click to verify your account:\n${verifyLink}`,
  });

  sendSuccess(
    res,
    { user: user.toPublicJSON() },
    'Signup successful. Check console for the verification link.',
    201
  );
});

/**
 * Marks the user as verified when a valid email token is presented.
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = verifyEmailVerifyToken(req.params.token);
  } catch {
    throw new AppError('Invalid or expired verification token', 400);
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  sendSuccess(res, { user: user.toPublicJSON() }, 'Email verified successfully');
});

/**
 * Authenticates credentials and returns an access token + refresh cookie.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new AppError('Invalid email or password', 401);
  }

  const { accessToken } = issueTokenPair(res, user);

  sendSuccess(
    res,
    { accessToken, user: user.toPublicJSON() },
    'Login successful'
  );
});

/**
 * Rotates refresh token (increments version) and returns a new access token.
 * Reuse of an old refresh token after rotation is rejected.
 */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
  if (!token) {
    throw new AppError('Refresh token missing', 401);
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    clearRefreshCookie(res);
    throw new AppError('User not found', 401);
  }

  // Token reuse / stale version after rotation
  if (payload.tokenVersion !== user.refreshTokenVersion) {
    user.refreshTokenVersion += 1;
    await user.save();
    clearRefreshCookie(res);
    throw new AppError('Refresh token reuse detected — session invalidated', 401);
  }

  user.refreshTokenVersion += 1;
  await user.save();

  const { accessToken } = issueTokenPair(res, user);

  sendSuccess(res, { accessToken, user: user.toPublicJSON() }, 'Token refreshed');
});

/**
 * Clears the refresh cookie and invalidates stored refresh versions.
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.sub);
      if (user) {
        user.refreshTokenVersion += 1;
        await user.save();
      }
    } catch {
      // Still clear cookie even if token is invalid
    }
  }

  clearRefreshCookie(res);
  sendSuccess(res, null, 'Logged out');
});

/**
 * Generates a password-reset token and simulates emailing it.
 * Always returns success to avoid email enumeration.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    const resetToken = signPasswordResetToken({ sub: user._id.toString() });
    const resetLink = `${env.clientUrl}/reset-password?token=${resetToken}`;

    await sendSimulatedEmail({
      to: user.email,
      subject: 'Reset your password',
      body: `Reset your password using this link (expires in 15 minutes):\n${resetLink}\n\nToken (for API testing):\n${resetToken}`,
    });
  }

  sendSuccess(
    res,
    null,
    'If an account exists for that email, a reset link has been sent (check server console).'
  );
});

/**
 * Validates a reset token and updates the user's password.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  let payload;
  try {
    payload = verifyPasswordResetToken(token);
  } catch {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const user = await User.findById(payload.sub).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.refreshTokenVersion += 1;
  await user.save();

  clearRefreshCookie(res);
  sendSuccess(res, null, 'Password updated. Please log in again.');
});

/**
 * Returns the authenticated user's public profile (requireAuth).
 */
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  sendSuccess(res, { user: user.toPublicJSON() }, 'OK');
});

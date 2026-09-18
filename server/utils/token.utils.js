import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { TOKEN_EXPIRY } from './constants.js';
import { TOKEN_PURPOSE } from './tokenPurpose.js';

/**
 * Signs a short-lived access JWT.
 * @param {{ sub: string, role: string }} payload
 * @returns {string}
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: TOKEN_EXPIRY.ACCESS });
}

/**
 * Signs a long-lived refresh JWT including token version for rotation.
 * @param {{ sub: string, tokenVersion: number }} payload
 * @returns {string}
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: TOKEN_EXPIRY.REFRESH });
}

/**
 * Verifies an access token and returns its payload.
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload}
 */
export function verifyAccessToken(token) {
  return /** @type {import('jsonwebtoken').JwtPayload} */ (
    jwt.verify(token, env.jwtAccessSecret)
  );
}

/**
 * Verifies a refresh token and returns its payload.
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload}
 */
export function verifyRefreshToken(token) {
  return /** @type {import('jsonwebtoken').JwtPayload} */ (
    jwt.verify(token, env.jwtRefreshSecret)
  );
}

/**
 * Signs a one-time email verification token.
 * @param {{ sub: string }} payload
 * @returns {string}
 */
export function signEmailVerifyToken(payload) {
  return jwt.sign(
    { ...payload, purpose: TOKEN_PURPOSE.EMAIL_VERIFY },
    env.jwtAccessSecret,
    { expiresIn: TOKEN_EXPIRY.EMAIL_VERIFY }
  );
}

/**
 * Verifies an email verification token and checks purpose.
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload}
 */
export function verifyEmailVerifyToken(token) {
  const payload = /** @type {import('jsonwebtoken').JwtPayload} */ (
    jwt.verify(token, env.jwtAccessSecret)
  );
  if (payload.purpose !== TOKEN_PURPOSE.EMAIL_VERIFY) {
    throw new Error('Invalid email verification token');
  }
  return payload;
}

/**
 * Signs a short-lived password-reset token.
 * @param {{ sub: string }} payload
 * @returns {string}
 */
export function signPasswordResetToken(payload) {
  return jwt.sign(
    { ...payload, purpose: TOKEN_PURPOSE.PASSWORD_RESET },
    env.jwtAccessSecret,
    { expiresIn: TOKEN_EXPIRY.PASSWORD_RESET }
  );
}

/**
 * Verifies a password-reset token and checks purpose.
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload}
 */
export function verifyPasswordResetToken(token) {
  const payload = /** @type {import('jsonwebtoken').JwtPayload} */ (
    jwt.verify(token, env.jwtAccessSecret)
  );
  if (payload.purpose !== TOKEN_PURPOSE.PASSWORD_RESET) {
    throw new Error('Invalid password reset token');
  }
  return payload;
}

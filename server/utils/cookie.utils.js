import { COOKIE_NAMES } from './constants.js';
import { env } from '../config/env.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cookie options for the refresh token (httpOnly; secure in production).
 * @returns {import('express').CookieOptions}
 */
export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: SEVEN_DAYS_MS,
  };
}

/**
 * Sets the rotated refresh token cookie on the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, refreshCookieOptions());
}

/**
 * Clears the refresh token cookie.
 * @param {import('express').Response} res
 */
export function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/api/auth',
  });
}

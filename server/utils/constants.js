/**
 * Shared domain enums/constants — import these instead of magic strings.
 */
export const USER_ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const POST_CATEGORIES = Object.freeze({
  UI_UX: 'UI/UX',
  INTEGRATIONS: 'Integrations',
  PERFORMANCE: 'Performance',
  GENERAL: 'General',
});

export const POST_STATUSES = Object.freeze({
  UNDER_REVIEW: 'under_review',
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
});

/** Canonical status progression for admin transitions. */
export const STATUS_SEQUENCE = Object.freeze([
  POST_STATUSES.UNDER_REVIEW,
  POST_STATUSES.PLANNED,
  POST_STATUSES.IN_PROGRESS,
  POST_STATUSES.COMPLETED,
]);

export const COOKIE_NAMES = Object.freeze({
  REFRESH_TOKEN: 'refreshToken',
});

export const TOKEN_EXPIRY = Object.freeze({
  ACCESS: '15m',
  REFRESH: '7d',
  EMAIL_VERIFY: '1d',
  PASSWORD_RESET: '15m',
});

/** Feed sort modes for GET /api/posts */
export const POST_SORT = Object.freeze({
  UPVOTED: 'upvoted',
  NEWEST: 'newest',
  DISCUSSED: 'discussed',
});

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
});

import { api } from './client';
import type { ApiSuccess, AuthUser } from '@/types';

type AuthPayload = {
  accessToken?: string;
  user: AuthUser;
};

/**
 * Auth API helpers.
 */
export const authApi = {
  signup: (body: { name: string; email: string; password: string }) =>
    api.post<ApiSuccess<{ user: AuthUser }>>('/auth/signup', body),

  login: (body: { email: string; password: string }) =>
    api.post<ApiSuccess<AuthPayload>>('/auth/login', body),

  refresh: () => api.post<ApiSuccess<AuthPayload>>('/auth/refresh', {}),

  logout: () => api.post<ApiSuccess<null>>('/auth/logout', {}),

  me: () => api.get<ApiSuccess<{ user: AuthUser }>>('/auth/me'),

  forgotPassword: (body: { email: string }) =>
    api.post<ApiSuccess<null>>('/auth/forgot-password', body),

  resetPassword: (body: { token: string; password: string }) =>
    api.post<ApiSuccess<null>>('/auth/reset-password', body),

  verifyEmail: (token: string) =>
    api.get<ApiSuccess<{ user: AuthUser }>>(`/auth/verify-email/${token}`),
};

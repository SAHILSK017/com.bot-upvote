import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

function getBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (!envUrl) return '/api';
  const cleaned = envUrl.replace(/\/+$/, '');
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
}

/**
 * Shared Axios instance — cookies for refresh; access token via Authorization header.
 */
export const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessTokenMemory: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attaches (or clears) the in-memory access token on the shared client.
 */
export function setAccessToken(token: string | null) {
  accessTokenMemory = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

/**
 * Returns the current in-memory access token.
 */
export function getAccessToken() {
  return accessTokenMemory;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type AuthHandlers = {
  onRefreshed: (token: string, user: unknown) => void;
  onRefreshFailed: () => void;
};

let authHandlers: AuthHandlers | null = null;

/**
 * Wires auth callbacks used by the 401 interceptor (set by AuthProvider).
 */
export function registerAuthHandlers(handlers: AuthHandlers) {
  authHandlers = handlers;
}

/**
 * Attempts a silent refresh using the httpOnly cookie.
 */
export async function silentRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', {})
      .then((res) => {
        const token = res.data?.data?.accessToken as string | undefined;
        const user = res.data?.data?.user;
        if (token) {
          setAccessToken(token);
          authHandlers?.onRefreshed(token, user);
          return token;
        }
        return null;
      })
      .catch(() => {
        setAccessToken(null);
        authHandlers?.onRefreshFailed();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Request interceptor to attach in-memory access token dynamically.
 */
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh on auth endpoints themselves
    const url = original.url || '';
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/signup') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    const token = await silentRefresh();
    if (!token) {
      return Promise.reject(error);
    }

    if (typeof original.headers?.set === 'function') {
      original.headers.set('Authorization', `Bearer ${token}`);
    } else {
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
    }

    return api(original);
  }
);

/**
 * Extracts a human-readable message from an Axios/API error.
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong') {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

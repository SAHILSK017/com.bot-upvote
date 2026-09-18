import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/api/auth.api';
import {
  getAccessToken,
  registerAuthHandlers,
  setAccessToken,
  silentRefresh,
} from '@/api/client';
import type { AuthUser } from '@/types';

export type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setSession: (token: string | null, user: AuthUser | null) => void;
  clearSession: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provides in-memory access token + user, with silent refresh on boot.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSession = useCallback((token: string | null, nextUser: AuthUser | null) => {
    setAccessToken(token);
    setTokenState(token);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
    registerAuthHandlers({
      onRefreshed: (token, nextUser) => {
        setTokenState(token);
        if (nextUser && typeof nextUser === 'object') {
          setUser(nextUser as AuthUser);
        }
      },
      onRefreshFailed: () => {
        setTokenState(null);
        setUser(null);
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await silentRefresh();
        if (cancelled) return;
        if (token) {
          setTokenState(token);
          try {
            const me = await authApi.me();
            if (!cancelled) setUser(me.data.data.user);
          } catch {
            if (!cancelled) clearSession();
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      const { accessToken: token, user: nextUser } = res.data.data;
      setSession(token || null, nextUser);
    },
    [setSession]
  );

  const signup = useCallback(async (name: string, email: string, password: string) => {
    await authApi.signup({ name, email, password });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: accessToken ?? getAccessToken(),
      isLoading,
      isAuthenticated: Boolean(user && (accessToken || getAccessToken())),
      isAdmin: user?.role === 'admin',
      setSession,
      clearSession,
      login,
      signup,
      logout,
    }),
    [user, accessToken, isLoading, setSession, clearSession, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads auth context; throws if used outside AuthProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

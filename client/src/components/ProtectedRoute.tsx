import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/spinner';

/**
 * Blocks unauthenticated users (redirects to login).
 * Waits for isInitializingAuth before deciding whether user is authenticated.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializingAuth, isLoading } = useAuth();
  const location = useLocation();

  if (isInitializingAuth || isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

/**
 * Blocks non-admin users from admin UI routes.
 * Waits for isInitializingAuth before deciding whether user is authenticated and admin.
 * Backend still enforces RBAC on every admin API.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, isInitializingAuth, isLoading } = useAuth();
  const location = useLocation();

  if (isInitializingAuth || isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

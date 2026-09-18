import { useAuthContext } from '@/context/AuthContext';

/**
 * Convenience hook for auth state and actions.
 */
export function useAuth() {
  return useAuthContext();
}

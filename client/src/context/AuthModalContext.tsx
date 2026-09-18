import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type AuthModalMode = 'login' | 'signup';

type AuthModalContextValue = {
  open: boolean;
  mode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setMode: (mode: AuthModalMode) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

/**
 * Controls the guest login/signup modal used when voting without a session.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>('login');

  const openAuthModal = useCallback((next: AuthModalMode = 'login') => {
    setMode(next);
    setOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, mode, openAuthModal, closeAuthModal, setMode }),
    [open, mode, openAuthModal, closeAuthModal]
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

/**
 * Access auth modal controls.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}

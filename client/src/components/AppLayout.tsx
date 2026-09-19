import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CompassIcon,
  LayoutGridIcon,
  LogOutIcon,
  MapIcon,
  ShieldIcon,
  ZapIcon,
  RadioIcon,
  PlayIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/context/AuthModalContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { cn } from '@/lib/utils';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
  );

export function AppLayout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout, isLoading, isInitializingAuth } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { startTour } = useOnboarding();

  async function handleLogout() {
    await logout();
    navigate('/feed');
  }

  return (
    <div className="text-foreground relative min-h-svh flex flex-col justify-between selection:bg-primary/20 selection:text-primary bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-[1760px] items-center justify-between gap-4 px-4 sm:px-8 xl:px-12">
          <div className="flex items-center gap-8 lg:gap-12">
            <Link to="/feed" className="group flex items-center gap-2.5">
              <img
                src="/assets/images/logo.png"
                alt="UPvote Logo"
                className="size-8 sm:size-9 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-0.5">
                  UP<span className="text-primary font-bold">vote</span>
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              <NavLink to="/feed" className={linkClass}>
                <LayoutGridIcon className="size-4 opacity-80" />
                <span>Feed</span>
              </NavLink>
              <NavLink to="/roadmap" data-tour="roadmap" className={linkClass}>
                <MapIcon className="size-4 opacity-80" />
                <span>Roadmap</span>
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary">
                  Live
                </span>
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={linkClass}>
                  <ShieldIcon className="size-4 text-amber-600 opacity-80" />
                  <span>Admin</span>
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-700">
                    Mod
                  </span>
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <CreatePostDialog size="sm" />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startTour}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border-border bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary shadow-2xs cursor-pointer"
            >
              <PlayIcon className="size-3 text-primary fill-primary" />
              <span>How it Works</span>
            </Button>

            <div className="hidden xl:flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <RadioIcon className="size-3 text-primary" />
              <span>Community Radar Active</span>
            </div>

            {isLoading || isInitializingAuth ? null : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1.5 pr-3 text-xs shadow-sm">
                  <div className="size-6 rounded-full bg-primary flex items-center justify-center font-bold text-white text-[10px]">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="font-medium text-foreground">{user?.name}</span>
                  {isAdmin && (
                    <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-700 uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md border-border bg-white hover:bg-slate-50 text-xs shadow-sm cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOutIcon className="size-3.5" />
                  <span className="hidden sm:inline">Log out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-md text-xs hover:bg-slate-100"
                  onClick={() => openAuthModal('login')}
                >
                  Log in
                </Button>
                <Button
                  size="sm"
                  className="btn-primary-solid rounded-md border-0 px-4 text-xs font-medium shadow-sm"
                  onClick={() => openAuthModal('signup')}
                >
                  <CompassIcon className="size-3.5" />
                  <span>Join Community</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 sm:px-8 xl:px-12 py-6 sm:py-8 lg:py-10">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-border bg-white">
        <div className="mx-auto flex max-w-[1760px] flex-col gap-6 px-4 py-10 sm:px-8 xl:px-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <img
                src="/assets/images/logo.png"
                alt="UPvote Logo"
                className="size-8 object-contain"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">UPvote</p>
                <p className="text-xs text-muted-foreground">
                  The transparent, community-driven co-creation engine.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <Link to="/feed" className="hover:text-primary transition-colors">
                Public Feed
              </Link>
              <Link to="/roadmap" className="hover:text-primary transition-colors">
                Sprint Roadmap
              </Link>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <ZapIcon className="size-3" />
                99.98% Platform Uptime
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} UPvote. All rights reserved.</p>
            <p className="font-mono text-[11px] opacity-75">
              Press <kbd className="rounded border border-border bg-slate-50 px-1.5 py-0.5 shadow-sm">⌘K</kbd> to explore requests
            </p>
          </div>
        </div>
      </footer>

      <OnboardingTour />
    </div>
  );
}


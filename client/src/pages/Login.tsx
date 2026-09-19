import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/api/client';
import { toastManager } from '@/components/ui/toast';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/utils/demoAccounts';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function fillDemo(demoEmail: string, demoPassword?: string) {
    setEmail(demoEmail);
    setPassword(demoPassword || DEMO_PASSWORD);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      toastManager.add({ title: 'Welcome back', type: 'success' });
      const from = (location.state as { from?: string })?.from || '/feed';
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl items-center justify-center py-6 sm:py-10 px-4">
      <div className="w-full overflow-hidden rounded-2xl border border-border bg-white shadow-xl grid md:grid-cols-2">
        {/* Left Side: Illustration */}
        <div className="relative hidden md:block bg-slate-50 border-r border-border min-h-[520px]">
          <img
            src="/assets/images/login_illustration.jpg"
            alt="SaaS Product Roadmap"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 text-white z-10">
            <h3 className="text-2xl font-bold tracking-tight mb-2">Build Better Products</h3>
            <p className="text-sm font-medium opacity-90">
              Join our community to shape the future of our product roadmap.
            </p>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex flex-col bg-white px-8 py-10 sm:px-10 justify-center">
          <div className="mb-2">
            <div className="mb-3 flex items-center gap-2">
              <img src="/assets/images/logo.png" alt="UPvote" className="size-7 object-contain" />
              <span className="font-extrabold tracking-tight text-foreground text-base">
                UP<span className="text-primary font-bold">vote</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to upvote and comment on ideas.
            </p>
          </div>

          <div className="my-5 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                type="button"
                size="sm"
                variant="outline"
                className="border-border hover:bg-slate-50 hover:text-primary transition-colors text-xs font-medium cursor-pointer"
                onClick={() => fillDemo(account.email, account.password)}
              >
                Demo {account.role} ({account.name})
              </Button>
            ))}
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="login-email" className="text-sm font-semibold">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-slate-50/60 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-10"
              />
            </Field>

            <Field>
              <Label htmlFor="login-password" className="text-sm font-semibold">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border bg-slate-50/60 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-10"
              />
            </Field>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 h-11 font-semibold text-sm cursor-pointer"
            >
              {submitting ? 'Please wait...' : 'Log in'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-8 text-center text-sm font-medium">
            No account?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
            {' · '}
            <Link to="/forgot-password" className="text-primary hover:underline">
              Forgot password
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

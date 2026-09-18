import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/context/AuthModalContext';
import { getErrorMessage } from '@/api/client';
import { toastManager } from '@/components/ui/toast';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/utils/demoAccounts';

/**
 * Split-layout login/signup modal with illustration.
 */
export function AuthModal() {
  const { open, mode, setMode, closeAuthModal } = useAuthModal();
  const { login, signup } = useAuth();
  const [name, setName] = useState('');
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
      if (mode === 'signup') {
        await signup(name, email, password);
        toastManager.add({
          title: 'Account created',
          description: 'Check the server console for the email verification link.',
          type: 'success',
        });
        await login(email, password);
      } else {
        await login(email, password);
        toastManager.add({ title: 'Welcome back', type: 'success' });
      }
      closeAuthModal();
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? closeAuthModal() : undefined)}>
      <DialogPopup className="max-w-4xl p-0 overflow-hidden sm:max-w-4xl md:max-w-4xl border-border shadow-lg rounded-none sm:rounded-none !flex-row grid md:grid-cols-2 gap-0">
        
        {/* Left Side: Illustration */}
        <div className="relative hidden md:block bg-slate-50 border-r border-border">
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
        <div className="flex flex-col bg-white">
          <DialogHeader className="px-8 pt-10 pb-2">
            <div className="mb-3 flex items-center gap-2">
              <img src="/assets/images/logo.png" alt="UPvote" className="size-7 object-contain" />
              <span className="font-extrabold tracking-tight text-foreground text-base">
                UP<span className="text-primary font-bold">vote</span>
              </span>
            </div>
            <DialogTitle className="text-2xl tracking-tight text-foreground">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {mode === 'login'
                ? 'Sign in to upvote and comment on ideas.'
                : 'Join to submit ideas and participate in the roadmap.'}
            </DialogDescription>
          </DialogHeader>
          
          <DialogPanel className="px-8 pb-10 pt-2 flex-1 flex flex-col justify-center">
            {mode === 'login' && (
              <div className="mb-6 flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-none border-border hover:bg-slate-50 hover:text-primary transition-colors text-xs"
                    onClick={() => fillDemo(account.email, account.password)}
                  >
                    Demo {account.role} ({account.name})
                  </Button>
                ))}
              </div>
            )}
            
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              {mode === 'signup' && (
                <Field>
                  <Label htmlFor="modal-name" className="text-sm font-semibold">Name</Label>
                  <Input
                    id="modal-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-none border-border bg-slate-50 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-10"
                  />
                </Field>
              )}
              <Field>
                <Label htmlFor="modal-email" className="text-sm font-semibold">Email</Label>
                <Input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-none border-border bg-slate-50 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-10"
                />
              </Field>
              <Field>
                <Label htmlFor="modal-password" className="text-sm font-semibold">Password</Label>
                <Input
                  id="modal-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="rounded-none border-border bg-slate-50 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-10"
                />
              </Field>
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}
              
              <Button type="submit" disabled={submitting} className="w-full mt-2 rounded-none h-11 font-semibold text-sm">
                {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
              </Button>
            </form>
            
            <p className="text-muted-foreground mt-8 text-center text-sm font-medium">
              {mode === 'login' ? (
                <>
                  No account?{' '}
                  <button type="button" className="text-primary hover:underline" onClick={() => setMode('signup')}>
                    Sign up
                  </button>
                  {' · '}
                  <Link to="/forgot-password" className="text-primary hover:underline" onClick={closeAuthModal}>
                    Forgot password
                  </Link>
                </>
              ) : (
                <>
                  Have an account?{' '}
                  <button type="button" className="text-primary hover:underline" onClick={() => setMode('login')}>
                    Log in
                  </button>
                </>
              )}
            </p>
          </DialogPanel>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

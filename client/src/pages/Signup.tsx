import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/api/client';
import { toastManager } from '@/components/ui/toast';

export default function SignupPage() {
  const { signup, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup(name, email, password);
      toastManager.add({
        title: 'Account created',
        description: 'Verification link was logged on the server console.',
        type: 'success',
      });
      await login(email, password);
      navigate('/feed');
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
          <div className="mb-4">
            <div className="mb-3 flex items-center gap-2">
              <img src="/assets/images/logo.png" alt="UPvote" className="size-7 object-contain" />
              <span className="font-extrabold tracking-tight text-foreground text-base">
                UP<span className="text-primary font-bold">vote</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Join to submit ideas and participate in the roadmap.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="signup-name" className="text-sm font-semibold">
                Name
              </Label>
              <Input
                id="signup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-border bg-slate-50/60 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-10"
              />
            </Field>

            <Field>
              <Label htmlFor="signup-email" className="text-sm font-semibold">
                Email
              </Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-slate-50/60 shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary h-10"
              />
            </Field>

            <Field>
              <Label htmlFor="signup-password" className="text-sm font-semibold">
                Password
              </Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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
              {submitting ? 'Please wait...' : 'Sign up'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-8 text-center text-sm font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

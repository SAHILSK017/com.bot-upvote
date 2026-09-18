import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/api/client';
import { toastManager } from '@/components/ui/toast';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/utils/demoAccounts';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      toastManager.add({ title: 'Logged in', type: 'success' });
      navigate('/feed');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md justify-center py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Access voting, comments, and submissions.</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>Demo accounts</AlertTitle>
            <AlertDescription>
              <p className="mb-3 text-xs text-muted-foreground">
                Admin: <code className="bg-muted rounded px-1.5 py-0.5 font-semibold text-foreground">Admin@1234</code> &nbsp;|&nbsp;
                User: <code className="bg-muted rounded px-1.5 py-0.5 font-semibold text-foreground">Demo@1234</code>
              </p>
              <div className="flex flex-col gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <div
                    key={account.email}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={account.role === 'Admin' ? 'default' : 'secondary'}>
                          {account.role}
                        </Badge>
                        <span className="truncate text-sm font-medium">{account.email}</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">{account.description}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fillDemo(account.email, account.password)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                Run <code className="bg-muted rounded px-1 py-0.5">npm run seed</code> if these
                accounts are missing.
              </p>
            </AlertDescription>
          </Alert>

          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Log in'}
            </Button>
          </form>
          <p className="text-muted-foreground text-center text-sm">
            <Link to="/signup" className="underline">
              Sign up
            </Link>
            {' · '}
            <Link to="/forgot-password" className="underline">
              Forgot password
            </Link>
          </p>
        </CardPanel>
      </Card>
    </div>
  );
}

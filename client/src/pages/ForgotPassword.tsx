import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/client';
import { toastManager } from '@/components/ui/toast';

/**
 * Forgot password request + reset form (token via query string).
 */
export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email });
      setDone(true);
      toastManager.add({
        title: 'Reset requested',
        description: 'If the account exists, a link was logged on the server console.',
        type: 'success',
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, password });
      toastManager.add({ title: 'Password updated', type: 'success' });
      setDone(true);
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
          <CardTitle>{token ? 'Reset password' : 'Forgot password'}</CardTitle>
          <CardDescription>
            {token
              ? 'Choose a new password for your account.'
              : 'We will simulate emailing a reset link to the server console.'}
          </CardDescription>
        </CardHeader>
        <CardPanel>
          {done ? (
            <p className="text-sm">
              Done.{' '}
              <Link to="/login" className="underline">
                Return to login
              </Link>
            </p>
          ) : token ? (
            <form className="flex flex-col gap-3" onSubmit={onReset}>
              <Field>
                <Label htmlFor="reset-password">New password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </Field>
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={onForgot}>
              <Field>
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}

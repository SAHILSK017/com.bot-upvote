import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
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
    <div className="mx-auto flex max-w-md justify-center py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
          <CardDescription>Create an account to submit and vote on ideas.</CardDescription>
        </CardHeader>
        <CardPanel>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
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
              {submitting ? 'Creating…' : 'Create account'}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="underline">
              Log in
            </Link>
          </p>
        </CardPanel>
      </Card>
    </div>
  );
}

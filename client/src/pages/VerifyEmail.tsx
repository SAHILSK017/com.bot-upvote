import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/client';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

/**
 * Email verification landing page (`/verify-email?token=`).
 */
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [message, setMessage] = useState('Verifying…');
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setOk(false);
      setMessage('Missing verification token.');
      return;
    }
    (async () => {
      try {
        await authApi.verifyEmail(token);
        setOk(true);
        setMessage('Email verified. You can log in now.');
      } catch (err) {
        setOk(false);
        setMessage(getErrorMessage(err));
      }
    })();
  }, [token]);

  return (
    <div className="mx-auto flex max-w-md justify-center py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
          <CardDescription>Confirming your account email address.</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col items-start gap-3">
          {ok === null && <Spinner />}
          <p className="text-sm">{message}</p>
          <Link to="/login" className="text-sm underline">
            Go to login
          </Link>
        </CardPanel>
      </Card>
    </div>
  );
}

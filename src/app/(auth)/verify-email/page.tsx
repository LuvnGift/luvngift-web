'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import Link from 'next/link';

type Status = 'loading' | 'success' | 'error';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    api.post('/api/v1/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <CardTitle>Email Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <CardDescription>Verifying your email address...</CardDescription>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div className="space-y-1">
              <p className="font-medium">Email verified!</p>
              <CardDescription>Your account is active. Sign in to finish setting up your profile.</CardDescription>
            </div>
            <Button className="w-full" asChild>
              <Link href="/login?redirect=/setup-location">Sign in</Link>
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <div className="space-y-1">
              <p className="font-medium">Verification failed</p>
              <CardDescription>
                The link is invalid or has expired. Request a new one by registering again.
              </CardDescription>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/register">Back to register</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        </CardContent>
      </Card>
    }>
      <VerifyEmailInner />
    </Suspense>
  );
}

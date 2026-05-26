'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const success = searchParams.get('success');

    if (success !== 'true') {
      router.replace('/login?error=oauth_failed');
      return;
    }

    // Cookies (accessToken, session) are already set by the API redirect.
    // Fetch the user profile through the Next.js proxy so the httpOnly
    // cookie is forwarded correctly.
    api
      .get('/api/v1/users/me')
      .then((r) => {
        const user = r.data.data;
        setUser(user);

        api
          .get('/api/v1/auth/socket-token')
          .then((sr) => connectSocket(sr.data.data.token))
          .catch(() => { /* non-critical */ });

        router.replace(user.role === 'ADMIN' ? '/admin' : '/');
      })
      .catch(() => {
        router.replace('/login?error=oauth_failed');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <Spinner />
        <p className="text-muted-foreground text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}

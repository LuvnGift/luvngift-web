'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const run = async () => {
      // The API delivers the one-time code in the URL fragment so it never
      // reaches a server log or Referer header.
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      const code = new URLSearchParams(hash).get('code');

      // Strip the code from the address bar / history immediately.
      window.history.replaceState(null, '', window.location.pathname);

      if (!code) {
        router.replace('/login?error=oauth_failed');
        return;
      }

      try {
        // Exchange through the Next.js proxy → cookies are set first-party.
        const r = await api.post('/api/v1/auth/oauth/exchange', { code });
        const user = r.data.data.user;
        setUser(user);

        // Fresh page load (OAuth redirect) so the Router Cache is already empty.
        router.replace(user.role === 'ADMIN' ? '/admin' : '/');
      } catch {
        router.replace('/login?error=oauth_failed');
      }
    };

    run();
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

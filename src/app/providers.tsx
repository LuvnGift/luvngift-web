'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

/**
 * Keep the realtime socket connected and in sync with auth state, independent of
 * the login/logout actions:
 * - Guests connect anonymously (enables realtime features like a public chat
 *   widget without logging in).
 * - Authenticated visitors fetch a socket token so they join their personal/admin
 *   rooms.
 * Reacts to `isAuthenticated` so a soft-nav login upgrades the anonymous socket to
 * an authenticated one (and logout downgrades it) without a full page reload.
 */
function useRealtimeSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let token: string | undefined;
      if (isAuthenticated) {
        try {
          const r = await api.get('/api/v1/auth/socket-token');
          token = r.data.data.token;
        } catch {
          /* fall back to an anonymous connection */
        }
      }
      if (cancelled) return;
      // Reconnect with the current auth context.
      disconnectSocket();
      connectSocket(token);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useRealtimeSocket();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

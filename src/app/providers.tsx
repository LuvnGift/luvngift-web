'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { api } from '@/lib/api';
import { connectSocket, getSocket, reauthenticateSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

/**
 * Who the socket connects as, asked on every (re)connect: a fresh token for a
 * signed-in visitor (the axios client renews an expired session first),
 * nothing for a guest, who connects anonymously (the public chat widget).
 */
async function socketToken(): Promise<string | undefined> {
  if (!useAuthStore.getState().isAuthenticated) return undefined;
  try {
    const r = await api.get('/api/v1/auth/socket-token');
    return r.data.data.token || undefined;
  } catch {
    return undefined; // connect anonymously rather than not at all
  }
}

/**
 * Keep the realtime socket connected and on the right identity. A sign-in or
 * sign-out without a page load reconnects the same socket as the new identity
 * (see `lib/socket.ts`).
 */
function useRealtimeSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (getSocket()) reauthenticateSocket();
    else connectSocket(socketToken);
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

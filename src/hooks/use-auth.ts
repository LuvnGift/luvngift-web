'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { LoginInput, RegisterInput } from '@luvngift/shared';

/** Only allow relative-path redirects to prevent open redirect attacks */
function safeRedirect(url: string | null, fallback: string): string {
  if (!url) return fallback;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return fallback;
}

export const useLogin = (opts?: { onError?: (err: any) => void }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setPendingTwoFactorToken } = useAuthStore();

  return useMutation({
    mutationFn: (data: LoginInput) =>
      api.post('/api/v1/auth/login', data).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data.requiresTwoFactor) {
        setPendingTwoFactorToken(data.tempToken);
        router.push('/2fa');
        return;
      }
      setUser(data.user);
      connectSocketFromApi();
      const defaultRoute = data.user?.role === 'ADMIN' ? '/admin' : '/';
      const redirect = safeRedirect(searchParams.get('redirect'), defaultRoute);
      // Invalidate the Next.js Router Cache so stale middleware redirects (cached
      // while the user was logged out) are not served after a successful login.
      router.refresh();
      router.push(redirect);
    },
    onError: opts?.onError,
  });
};

export const useRegister = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post('/api/v1/auth/register', data).then((r) => r.data.data),
    onSuccess: () => router.push('/login?registered=true'),
  });
};

export const useLogout = () => {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  const cleanup = () => {
    clearAuth();
    disconnectSocket();
    queryClient.clear();
    router.push('/');
  };

  return useMutation({
    mutationFn: () => api.post('/api/v1/auth/logout').then((r) => r.data),
    onSuccess: cleanup,
    onError: cleanup,
  });
};

export const useMe = () => {
  const { isAuthenticated, setUser } = useAuthStore();
  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/v1/users/me').then((r) => r.data.data),
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) setUser(query.data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess, query.data]);

  // Intentionally no clearAuth() on error here. The axios interceptor is the single
  // authority on auth failures: it refreshes on 401 and, only if refresh truly fails,
  // clears auth and redirects to /login. Logging out on every query error (transient
  // network blips, 500s, refresh races) is what made the header flicker to signed-out.

  return query;
};

/** Connect socket — fetch an access token reference for socket auth */
function connectSocketFromApi() {
  // Socket.io needs a token for its handshake auth.
  // We fetch it from a lightweight endpoint that returns the token from the cookie.
  api.get('/api/v1/auth/socket-token')
    .then((r) => connectSocket(r.data.data.token))
    .catch(() => { /* Socket connection is non-critical */ });
}

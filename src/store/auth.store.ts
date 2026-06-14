'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@luvngift/shared';

interface AuthState {
  // Full user object — in memory only, never written to localStorage.
  user: User | null;
  // Persisted flag — only thing stored in localStorage. No PII.
  isAuthenticated: boolean;
  // Short-lived 2FA intermediate token — held in memory only, never in storage.
  pendingTwoFactorToken: string | null;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setPendingTwoFactorToken: (token: string) => void;
  clearPendingTwoFactorToken: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      pendingTwoFactorToken: null,
      setUser: (user) => {
        // The `session` cookie (read by Next.js middleware) is owned by the API,
        // which sets it with a 7-day Max-Age on login/refresh/OAuth. We must NOT
        // overwrite it here: a client-side `document.cookie` write has no Max-Age,
        // which would downgrade it to a session-scoped cookie that dies on browser
        // close — leaving middleware-gated routes (e.g. /custom) redirecting to
        // /login even though the refresh token is still valid.
        set({ user, isAuthenticated: true });
      },
      clearAuth: () => {
        document.cookie = 'session=; Path=/; Max-Age=0';
        set({ user: null, isAuthenticated: false, pendingTwoFactorToken: null });
      },
      setPendingTwoFactorToken: (token) => set({ pendingTwoFactorToken: token }),
      clearPendingTwoFactorToken: () => set({ pendingTwoFactorToken: null }),
    }),
    {
      name: 'auth-user',
      // Only persist the boolean flag, never the user object or 2FA token.
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    },
  ),
);

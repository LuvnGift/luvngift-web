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
        // Write the `session` cookie (read by Next.js middleware) synchronously so
        // it exists for the very next navigation — e.g. router.push('/custom')
        // immediately after login. Relying solely on the API's Set-Cookie (via the
        // proxy) is not safe here: it may not be committed before middleware runs
        // for the redirect target, which bounces the user back to /login.
        //
        // Critically, set a 7-day Max-Age (matching the refresh token / the API's
        // own session cookie) so it is a persistent cookie and survives a browser
        // restart. Without Max-Age it would be session-scoped and middleware-gated
        // routes would break after the browser is closed.
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const attrs = isSecure ? '; SameSite=None; Secure' : '; SameSite=Lax';
        const maxAge = 7 * 24 * 60 * 60; // 7 days, in seconds
        document.cookie = `session=${JSON.stringify({ isAuth: true, role: user.role })}; Path=/; Max-Age=${maxAge}${attrs}`;
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

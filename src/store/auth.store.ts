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
        // Write a non-httpOnly session cookie so Next.js middleware can read isAuth + role.
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const secure = isSecure ? '; Secure' : '';
        const sameSite = isSecure ? 'None' : 'Lax';
        document.cookie = `session=${JSON.stringify({ isAuth: true, role: user.role })}; Path=/; SameSite=${sameSite}${secure}`;
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

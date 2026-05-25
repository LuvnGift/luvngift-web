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
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false, pendingTwoFactorToken: null }),
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

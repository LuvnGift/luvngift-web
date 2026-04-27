'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@luvngift/shared';

interface AuthState {
  // Full user object — in memory only, never written to localStorage.
  user: User | null;
  // Persisted flag — only thing stored in localStorage. No PII.
  // useMe() reads this to know whether to re-fetch the user on hard reload.
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-user',
      // Only persist the boolean flag, never the user object.
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    },
  ),
);

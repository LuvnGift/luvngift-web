'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@luvngift/shared';

interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

// The session cookie used by Next.js middleware for route protection is set by
// the API (via the Next.js proxy rewrite), making it a first-party cookie on the
// web domain. No JS cookie management needed here.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
    }),
    { name: 'auth-user' },
  ),
);

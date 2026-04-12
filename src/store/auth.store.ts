'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@celebrate4me/shared';

interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

function setSessionCookie(user: User) {
  if (typeof document === 'undefined') return;
  const value = JSON.stringify({ isAuth: true, role: user.role });
  // Session cookie — expires when tab closes (no max-age); middleware reads it server-side
  document.cookie = `session=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function clearSessionCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => {
        set({ user });
        setSessionCookie(user);
      },
      clearAuth: () => {
        set({ user: null });
        clearSessionCookie();
      },
    }),
    {
      name: 'auth-user',
      onRehydrateStorage: () => (state) => {
        // Re-write the session cookie after localStorage rehydration so the
        // Next.js middleware can read the role on hard reloads/tab reopens.
        if (state?.user) setSessionCookie(state.user);
      },
    },
  ),
);

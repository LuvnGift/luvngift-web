'use client';

import { create } from 'zustand';
import { User } from '@luvngift/shared';
import { hasSessionHint } from '@/lib/session-hint';

interface AuthState {
  // Full user object, in memory only.
  user: User | null;
  /**
   * Whether this browser holds a session. Starts from the API's `session`
   * cookie, the same signal the middleware reads, so the page and the
   * middleware cannot disagree about who is signed in.
   */
  isAuthenticated: boolean;
  // Short-lived 2FA intermediate token, held in memory only, never in storage.
  pendingTwoFactorToken: string | null;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setPendingTwoFactorToken: (token: string) => void;
  clearPendingTwoFactorToken: () => void;
}

/**
 * Sign-in state used to live in four places: the httpOnly token cookies, the
 * API's `session` cookie, a second copy of that cookie written here, and an
 * `isAuthenticated` flag in localStorage. They drifted: a localStorage "signed
 * in" outlived the session, and the copy written here outlived the API's own.
 *
 * Now the API writes every auth cookie and this store only reads `session`.
 * The copy written here was for when the API was cross-origin, so its cookie
 * never reached the web domain; every auth call now goes through the Next.js
 * proxy (`next.config.ts` rewrites), and a browser stores a response's
 * Set-Cookie before the code awaiting that response runs. The copy could not
 * have helped anyway: the middleware trusts `session` only beside the httpOnly
 * `refreshToken`, which only the API can write.
 *
 * `clearAuth` still DELETES `session`, because the refresh token is httpOnly
 * and the middleware needs one of the two gone to see "signed out" when the
 * API rejected the session without clearing its cookies.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: hasSessionHint(),
  pendingTwoFactorToken: null,
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearAuth: () => {
    if (typeof document !== 'undefined') document.cookie = 'session=; Path=/; Max-Age=0';
    set({ user: null, isAuthenticated: false, pendingTwoFactorToken: null });
  },
  setPendingTwoFactorToken: (token) => set({ pendingTwoFactorToken: token }),
  clearPendingTwoFactorToken: () => set({ pendingTwoFactorToken: null }),
}));

// The old localStorage flag ('auth-user') is no longer used; remove it so the
// browser holds nothing the Cookie Policy does not list.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('auth-user');
  } catch {
    /* storage blocked: nothing to remove */
  }
}

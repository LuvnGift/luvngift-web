'use client';

import { isStaffRole } from '@luvngift/shared';
import { useAuthStore } from '@/store/auth.store';

/**
 * True once the signed-in user is known to be an admin OR staff: a team
 * account, which cannot shop (the storefront shows it as a preview). The user object is held
 * in memory only (loaded by `useMe`), so this is false on the server render and
 * the first client render, which keeps hydration consistent.
 *
 * Presentation only: the API is what refuses admin accounts (403 ADMIN_ACCOUNT).
 */
export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.isAuthenticated && isStaffRole(s.user?.role));
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Footer "Account" links. Protected links (My Orders, Profile) are only rendered
 * once we know the user is signed in — so they're never present in the DOM (and
 * therefore never prefetched) for logged-out visitors. Guests see sign-in links
 * instead. The `mounted` guard keeps SSR and first client render identical
 * (both show the guest version) to avoid hydration mismatch.
 */
export function FooterAccountLinks() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const authed = mounted && isAuthenticated;

  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {authed ? (
        <>
          <li>
            <Link href="/orders" className="hover:text-foreground transition-colors">
              My Orders
            </Link>
          </li>
          <li>
            <Link href="/account" className="hover:text-foreground transition-colors">
              Profile
            </Link>
          </li>
        </>
      ) : (
        <>
          <li>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
          </li>
          <li>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Create account
            </Link>
          </li>
        </>
      )}
    </ul>
  );
}

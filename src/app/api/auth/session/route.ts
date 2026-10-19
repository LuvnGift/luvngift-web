import { NextRequest, NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/auth-redirect';

/**
 * Renews an expired sign-in on a full page load, then continues to `next`.
 *
 * Why this exists: the access token lives 15 minutes, but the `session` hint
 * cookie and the refresh token live 7 days. Opening any /admin URL after 15
 * minutes away — a bookmark, or a link in an admin alert email — went:
 *
 *   /admin  → layout cannot verify the (expired) token → /login
 *   /login  → middleware sees the 7-day "admin session" → /admin  → …
 *
 * an infinite redirect that ended in the browser's "too many redirects" page.
 * The client-side axios refresh never got a chance, because no page rendered.
 *
 * A server component cannot set cookies, so the renewal happens here, in a
 * route handler: exchange the refresh token for new cookies, then redirect.
 * Before sending anyone into /admin it confirms — with the NEW token — that the
 * account really is an admin, so this route can never feed a loop of its own.
 * If anything fails, the auth cookies are cleared and the visitor is sent to
 * /login, which the middleware then lets them reach.
 */

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Every auth cookie the API sets. Cleared together, or the loop comes back. */
const AUTH_COOKIES = ['accessToken', 'refreshToken', 'session'];

export async function GET(req: NextRequest) {
  const next = safeNextPath(req.nextUrl.searchParams.get('next'));
  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken) return signedOut(req, next);

  const refreshed = await refresh(refreshToken);
  if (!refreshed) return signedOut(req, next);

  let destination = next;
  if (next.startsWith('/admin') && !(await isAdmin(refreshed.accessToken))) {
    // A valid customer session (or a demoted admin) must not be sent back into
    // /admin, where the layout would reject it again.
    destination = '/';
  }

  const res = NextResponse.redirect(new URL(destination, req.url));
  for (const cookie of refreshed.setCookies) res.headers.append('set-cookie', cookie);
  return res;
}

async function refresh(
  refreshToken: string,
): Promise<{ accessToken: string; setCookies: string[] } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `refreshToken=${encodeURIComponent(refreshToken)}`,
      },
      body: '{}',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    const accessToken: unknown = body?.data?.accessToken;
    if (typeof accessToken !== 'string') return null;
    return { accessToken, setCookies: res.headers.getSetCookie() };
  } catch {
    return null;
  }
}

async function isAdmin(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.data?.role === 'ADMIN';
  } catch {
    return false;
  }
}

/** Clears every auth cookie and sends the visitor to sign in, returning to `next` after. */
function signedOut(req: NextRequest, next: string) {
  const login = new URL('/login', req.url);
  if (next !== '/') login.searchParams.set('redirect', next);
  const res = NextResponse.redirect(login);
  for (const name of AUTH_COOKIES) res.cookies.set(name, '', { path: '/', maxAge: 0 });
  return res;
}

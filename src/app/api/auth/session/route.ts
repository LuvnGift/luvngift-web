import { NextRequest, NextResponse } from 'next/server';
import { destinationForRole, safeNextPath } from '@/lib/auth-redirect';
import { isTransientStatus, sessionFetch } from '@/lib/api-fetch';

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
 * If the API rejects the refresh token, the auth cookies are cleared and the
 * visitor is sent to /login, which the middleware then lets them reach. If the
 * API cannot answer at all, a 503 retry page is returned and nothing is
 * cleared: an outage must not sign anyone out.
 */

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Every auth cookie the API sets. Cleared together, or the loop comes back. */
const AUTH_COOKIES = ['accessToken', 'refreshToken', 'session'];

/** The API could not answer (5xx, 429, timeout, network): neither yes nor no. */
const UNAVAILABLE = 'unavailable' as const;

export async function GET(req: NextRequest) {
  const next = safeNextPath(req.nextUrl.searchParams.get('next'));
  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken) return signedOut(req, next);

  const refreshed = await refresh(refreshToken);
  // Keep the cookies: the refresh token is still good once the API is back.
  if (refreshed === UNAVAILABLE) return unavailable(req);
  if (!refreshed) return signedOut(req, next);

  let destination = next;
  // A valid session must not be sent back into a section its role is refused
  // from (a customer or demoted admin into /admin, a customer into /ops), where
  // the layout would reject it again. If the role cannot be checked, go on:
  // the layout checks again and shows its error page.
  if (next.startsWith('/admin') || next.startsWith('/ops')) {
    const role = await roleOf(refreshed.accessToken);
    if (role !== UNAVAILABLE) destination = destinationForRole(next, role ?? 'CUSTOMER');
  }

  const res = NextResponse.redirect(new URL(destination, req.url));
  for (const cookie of refreshed.setCookies) res.headers.append('set-cookie', cookie);
  return res;
}

async function refresh(
  refreshToken: string,
): Promise<{ accessToken: string; setCookies: string[] } | null | typeof UNAVAILABLE> {
  try {
    const res = await sessionFetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `refreshToken=${encodeURIComponent(refreshToken)}`,
      },
      body: '{}',
    });
    if (isTransientStatus(res.status)) return UNAVAILABLE;
    if (!res.ok) return null;
    const body = await res.json();
    const accessToken: unknown = body?.data?.accessToken;
    if (typeof accessToken !== 'string') return null;
    return { accessToken, setCookies: res.headers.getSetCookie() };
  } catch {
    return UNAVAILABLE;
  }
}

/** The account's role from the API, null when the token is refused, or UNAVAILABLE. */
async function roleOf(accessToken: string): Promise<string | null | typeof UNAVAILABLE> {
  try {
    const res = await sessionFetch(`${API_URL}/api/v1/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (isTransientStatus(res.status)) return UNAVAILABLE;
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.data?.role === 'string' ? body.data.role : null;
  } catch {
    return UNAVAILABLE;
  }
}

/** A retry page that leaves every cookie alone. */
function unavailable(req: NextRequest) {
  const retry = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Try again shortly</title></head>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem">
<h1 style="font-size:1.4rem">We couldn't reach our servers</h1>
<p>You are still signed in. Please try again in a moment.</p>
<p><a href="${escapeHtml(retry)}">Try again</a></p></body></html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'retry-after': '10', 'cache-control': 'no-store' },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Clears every auth cookie and sends the visitor to sign in, returning to `next` after. */
function signedOut(req: NextRequest, next: string) {
  const login = new URL('/login', req.url);
  if (next !== '/') login.searchParams.set('redirect', next);
  const res = NextResponse.redirect(login);
  for (const name of AUTH_COOKIES) res.cookies.set(name, '', { path: '/', maxAge: 0 });
  return res;
}

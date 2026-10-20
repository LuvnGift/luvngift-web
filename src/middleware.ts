import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isInSection, safeNextPath, sessionRefreshUrl } from '@/lib/auth-redirect';

// Routes that require the user to be logged in.
// Note: /custom is intentionally public — guests can build a custom gift; auth is
// enforced only at submit (see custom page). Keeping it out of this list avoids
// prefetched redirect-to-login responses poisoning the client Router Cache.
const AUTH_REQUIRED = ['/orders', '/account', '/setup-location'];
// Routes only for unauthenticated users (redirect away if already logged in)
const GUEST_ONLY = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/2fa'];
// Routes that require admin role
const ADMIN_ONLY = ['/admin'];

/**
 * Reads the `session` hint cookie. It is only a hint — it lives 7 days and is
 * never verified here — so it is trusted only while a refresh token exists to
 * back it. A hint with no refresh token behind it is stale (`stale: true`) and
 * is treated as signed out, then cleared.
 */
function parseSessionCookie(request: NextRequest) {
  const raw = request.cookies.get('session')?.value;
  if (!raw) return { isAuth: false, role: null, stale: false };
  const hasRefreshToken = !!request.cookies.get('refreshToken')?.value;
  try {
    const parsed = JSON.parse(raw);
    const claimsAuth = !!parsed?.isAuth;
    return {
      isAuth: claimsAuth && hasRefreshToken,
      role: parsed?.role ?? null,
      stale: claimsAuth && !hasRefreshToken,
    };
  } catch {
    return { isAuth: false, role: null, stale: true };
  }
}

/** Sign-in page that returns to where the visitor was going. */
function loginRedirect(request: NextRequest, next: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', next);
  return NextResponse.redirect(loginUrl);
}

/**
 * The auth redirect for this request, or null to let it through.
 *
 * The admin rules are what break the old redirect loop (see
 * `app/api/auth/session/route.ts`): an admin whose 15-minute access token has
 * expired is sent to renew it, rather than to /login — which bounced straight
 * back to /admin because the 7-day session hint still said "admin".
 */
function authRedirect(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { isAuth, role } = parseSessionCookie(request);

  if (isAuth && GUEST_ONLY.some((p) => isInSection(pathname, p))) {
    // Honour ?redirect= so a re-login lands on the page an alert email linked to.
    const fallback = role === 'ADMIN' ? '/admin' : '/';
    const dest = safeNextPath(request.nextUrl.searchParams.get('redirect'), fallback);
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (!isAuth && AUTH_REQUIRED.some((p) => isInSection(pathname, p))) {
    return loginRedirect(request, pathname);
  }

  if (ADMIN_ONLY.some((p) => isInSection(pathname, p))) {
    if (!isAuth) return loginRedirect(request, pathname + search);
    if (role !== 'ADMIN') return NextResponse.redirect(new URL('/', request.url));
    if (!request.cookies.get('accessToken')?.value) {
      return NextResponse.redirect(new URL(sessionRefreshUrl(pathname + search), request.url));
    }
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { stale } = parseSessionCookie(request);
  const redirect = authRedirect(request);
  if (redirect) {
    if (stale) redirect.cookies.set('session', '', { path: '/', maxAge: 0 });
    return redirect;
  }

  // The admin layout needs the requested path to send a failed verification
  // through the session refresh and back again; server components cannot read
  // the URL otherwise.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search);

  // Add security headers
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (stale) response.cookies.set('session', '', { path: '/', maxAge: 0 });

  // Content Security Policy
  // 'unsafe-eval' is required by Next.js React Refresh in development (hot reload).
  // It is intentionally excluded from production builds.
  const isDev = process.env.NODE_ENV !== 'production';

  /**
   * Sentry's browser SDK POSTs events to the ingest host encoded in the DSN,
   * which is a different origin — so without it in `connect-src` the browser
   * blocks every event. The failure reads like a CORS error in the console,
   * which is misleading: nothing is wrong with Sentry, the page's own policy
   * is refusing the request.
   *
   * Derived from the DSN rather than hardcoded, so it stays correct across
   * Sentry regions (o123.ingest.us.sentry.io, .de., ...) and stays empty —
   * granting nothing — when no DSN is configured.
   */
  const sentryIngestOrigin = (() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return '';
    try {
      return new URL(dsn).origin;
    } catch {
      return '';
    }
  })();
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.stripe.com",
      "font-src 'self'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL} ${process.env.NEXT_PUBLIC_SOCKET_URL} ${(process.env.NEXT_PUBLIC_SOCKET_URL ?? '').replace(/^http/, 'ws')} https://api.stripe.com wss:${sentryIngestOrigin ? ` ${sentryIngestOrigin}` : ''}`,
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require the user to be logged in
const AUTH_REQUIRED = ['/custom', '/orders', '/account', '/setup-location'];
// Routes only for unauthenticated users (redirect away if already logged in)
const GUEST_ONLY = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/2fa'];
// Routes that require admin role
const ADMIN_ONLY = ['/admin'];

function parseSessionCookie(request: NextRequest) {
  const raw = request.cookies.get('session')?.value;
  if (!raw) return { isAuth: false, role: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      isAuth: !!parsed?.isAuth,
      role: parsed?.role ?? null,
    };
  } catch {
    return { isAuth: false, role: null };
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { isAuth, role } = parseSessionCookie(request);

  // Redirect logged-in users away from guest-only pages
  if (isAuth && GUEST_ONLY.some((p) => pathname.startsWith(p))) {
    const dest = role === 'ADMIN' ? '/admin' : '/';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Redirect unauthenticated users away from protected pages
  if (!isAuth && AUTH_REQUIRED.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Restrict admin section to admin role only
  if (ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    if (!isAuth) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Add security headers
  const response = NextResponse.next();

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.stripe.com",
      "font-src 'self'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL} ${process.env.NEXT_PUBLIC_SOCKET_URL} https://api.stripe.com`,
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

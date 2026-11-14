/**
 * Where the session-refresh route may send someone afterwards.
 *
 * Only same-site paths: `next` arrives in a query string, so without this the
 * route is an open redirect (`?next=https://evil.example` or `?next=//evil`).
 * The refresh route itself is excluded so it can never redirect to itself.
 */
export const SESSION_REFRESH_PATH = '/api/auth/session';

export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  // Must be a path on this site: one leading slash, not two (protocol-relative),
  // and no backslash (browsers treat `/\evil` like `//evil`).
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback;
  if (raw.startsWith(SESSION_REFRESH_PATH)) return fallback;
  return raw;
}

/** URL of the refresh route that brings the visitor back to `next` afterwards. */
export function sessionRefreshUrl(next: string): string {
  return `${SESSION_REFRESH_PATH}?next=${encodeURIComponent(safeNextPath(next))}`;
}

/**
 * True when `pathname` is `section` itself or a page beneath it. A bare
 * `startsWith` treated the public `/account-deletion` page as part of the
 * signed-in `/account` section and bounced signed-out visitors to /login —
 * the one audience that page exists for (Google Play requires it be public).
 */
export function isInSection(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(`${section}/`);
}

/** The admin's own profile: 2FA, password. Lives in the dashboard, not /account. */
export const ADMIN_PROFILE_PATH = '/admin/profile';

/**
 * Customer account pages and where an admin who lands on one is sent instead.
 * Admin accounts cannot order or subscribe (the API refuses them with
 * ADMIN_ACCOUNT), so these pages would only show empty or broken flows, and the
 * account page's security settings now live at ADMIN_PROFILE_PATH. The public
 * storefront (home, occasions, bundles) stays browsable as a preview.
 */
const ADMIN_REDIRECTS: Array<[section: string, destination: string]> = [
  // Most specific first: the first matching section wins.
  ['/account/subscriptions', '/admin/subscriptions'],
  ['/account', ADMIN_PROFILE_PATH],
  ['/orders', '/admin/orders'],
  ['/setup-location', '/admin'],
];

/** Where to send an admin requesting `pathname`, or null to let them through. */
export function adminRedirectFor(pathname: string): string | null {
  const match = ADMIN_REDIRECTS.find(([section]) => isInSection(pathname, section));
  return match ? match[1] : null;
}

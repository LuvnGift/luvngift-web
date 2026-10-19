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

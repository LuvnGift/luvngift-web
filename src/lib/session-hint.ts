/**
 * The API's `session` cookie: `{"isAuth":true,"role":"…"}`, not httpOnly, no
 * secrets. It says a session exists; the httpOnly tokens prove it. The
 * middleware trusts it only beside a refresh token, and clears it otherwise
 * on the document request, so by the time page code runs a stale one is gone.
 */
export function parseSessionHint(cookieHeader: string): { isAuth: boolean; role: string | null } {
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]*)/);
  if (!match?.[1]) return { isAuth: false, role: null };
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return { isAuth: parsed?.isAuth === true, role: typeof parsed?.role === 'string' ? parsed.role : null };
  } catch {
    return { isAuth: false, role: null };
  }
}

/** Whether this browser holds a session hint. Always false on the server. */
export function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return parseSessionHint(document.cookie).isAuth;
}

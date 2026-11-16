/**
 * Which 401s the axios client should answer with a session refresh.
 *
 * Only the auth endpoints that run WITHOUT a session are excluded: their 401
 * means "wrong credentials" (login, the 2FA step of login) or "the session is
 * already gone" (refresh itself, which would loop), so the caller must see it.
 *
 * Everything else under /api/v1/auth/ needs a signed-in user: 2FA setup, verify
 * and disable, change-password, socket-token. Excluding the whole prefix used to
 * mean an access token that expired while someone sat on the account page made
 * "Enable 2FA" fail with a 401 and never recover, because nobody refreshed it.
 */
const NO_REFRESH_AUTH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/2fa/verify-login',
  '/api/v1/auth/oauth/exchange',
];

export function shouldRefreshOn401(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0];
  return !NO_REFRESH_AUTH_PATHS.includes(path);
}

/**
 * Whether a failed refresh means the session is really over: only when the API
 * answered about the token (400/401/403). A network error, timeout, 5xx or 429
 * says nothing about it, and signing out then logged everyone out on a deploy.
 */
export function refreshFailureEndsSession(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === undefined) return false;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

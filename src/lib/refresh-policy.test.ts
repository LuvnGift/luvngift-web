import { describe, it, expect } from 'vitest';
import { shouldRefreshOn401, refreshFailureEndsSession } from './refresh-policy';

/**
 * Signed-in auth calls must refresh an expired access token like any other
 * request. They did not: the whole /api/v1/auth/ prefix was excluded, so
 * "Enable 2FA" failed with a 401 once the 15-minute token had expired.
 */
describe('shouldRefreshOn401', () => {
  it.each([
    '/api/v1/auth/2fa/setup',
    '/api/v1/auth/2fa/verify',
    '/api/v1/auth/2fa/disable',
    '/api/v1/auth/change-password',
    '/api/v1/auth/socket-token',
    '/api/v1/users/me',
    '/api/v1/admin/orders?page=2',
  ])('refreshes on %s', (url) => {
    expect(shouldRefreshOn401(url)).toBe(true);
  });

  it.each([
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
    '/api/v1/auth/2fa/verify-login',
    '/api/v1/auth/oauth/exchange',
    '/api/v1/auth/reset-password',
    undefined,
  ])('does not refresh on %s (no session, or the refresh itself)', (url) => {
    expect(shouldRefreshOn401(url)).toBe(false);
  });
});

describe('refreshFailureEndsSession', () => {
  const httpError = (status: number) => ({ response: { status } });

  it('ends the session when the API rejects the refresh token', () => {
    for (const s of [400, 401, 403]) expect(refreshFailureEndsSession(httpError(s))).toBe(true);
  });

  it('keeps the session when the API could not answer', () => {
    for (const s of [500, 502, 503, 408, 429]) {
      expect(refreshFailureEndsSession(httpError(s))).toBe(false);
    }
    expect(refreshFailureEndsSession(new Error('Network Error'))).toBe(false);
  });
});

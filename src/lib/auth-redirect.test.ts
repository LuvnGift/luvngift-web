import { describe, it, expect } from 'vitest';
import { isInSection, safeNextPath, sessionRefreshUrl } from './auth-redirect';

/**
 * `next` / `redirect` arrive in query strings, so these guard against open
 * redirects — the refresh route must only ever send someone to a path on this
 * site, and never back to itself.
 */
describe('safeNextPath', () => {
  it('keeps a same-site path with its query string', () => {
    expect(safeNextPath('/admin/orders?order=cabc123')).toBe('/admin/orders?order=cabc123');
  });

  it.each([
    ['absolute URL', 'https://evil.example/admin'],
    ['protocol-relative', '//evil.example'],
    ['backslash trick', '/\\evil.example'],
    ['not a path', 'admin'],
    ['empty', ''],
  ])('rejects %s', (_label, raw) => {
    expect(safeNextPath(raw, '/fallback')).toBe('/fallback');
  });

  it('never points back at the refresh route itself', () => {
    expect(safeNextPath('/api/auth/session?next=/admin', '/admin')).toBe('/admin');
  });
});

describe('sessionRefreshUrl', () => {
  it('encodes the destination so its own query string survives', () => {
    expect(sessionRefreshUrl('/admin/orders?order=cabc123')).toBe(
      '/api/auth/session?next=%2Fadmin%2Forders%3Forder%3Dcabc123',
    );
  });

  it('falls back to the home page for an unsafe destination', () => {
    expect(sessionRefreshUrl('//evil.example')).toBe('/api/auth/session?next=%2F');
  });
});

describe('isInSection', () => {
  it('matches the section and pages beneath it', () => {
    expect(isInSection('/account', '/account')).toBe(true);
    expect(isInSection('/account/settings', '/account')).toBe(true);
    expect(isInSection('/admin/orders', '/admin')).toBe(true);
  });

  it('does not match a sibling route that merely shares a prefix', () => {
    expect(isInSection('/account-deletion', '/account')).toBe(false);
    expect(isInSection('/administrator', '/admin')).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

/**
 * The session route must sign someone out only when the API rejects their
 * refresh token. An outage used to clear a still-valid 7-day session on every
 * full load of an /admin page during a deploy or cold start.
 */

const request = (cookie = 'refreshToken=rt_1', next = '/admin/orders') =>
  new NextRequest(`https://luvngift.test/api/auth/session?next=${encodeURIComponent(next)}`, {
    headers: { cookie },
  });

/** Refresh succeeds, then /users/me answers with this role. */
const refreshedAs = (role: string) =>
  vi
    .fn()
    .mockResolvedValueOnce(json(200, { data: { accessToken: 'at_2' } }))
    .mockResolvedValueOnce(json(200, { data: { role } }));

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

const clearsCookies = (res: Response) =>
  res.headers.getSetCookie().some((c) => /^refreshToken=;/.test(c));

describe('GET /api/auth/session', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps the cookies and returns 503 when the API is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => json(503, {})));
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(clearsCookies(res)).toBe(false);
  });

  it('keeps the cookies when the API cannot be reached at all', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(clearsCookies(res)).toBe(false);
  });

  it('signs out when the API rejects the refresh token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(401, {})));
    const res = await GET(request());
    expect(res.headers.get('location')).toContain('/login?redirect=%2Fadmin%2Forders');
    expect(clearsCookies(res)).toBe(true);
  });

  it('goes on to the admin page when the role check is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json(200, { data: { accessToken: 'at_2' } }, { 'set-cookie': 'accessToken=at_2; Path=/' }),
      )
      .mockResolvedValueOnce(json(502, {}));
    vi.stubGlobal('fetch', fetch);
    const res = await GET(request());
    expect(new URL(res.headers.get('location')!).pathname).toBe('/admin/orders');
  });

  it('sends a non-admin home instead of back into /admin', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(200, { data: { accessToken: 'at_2' } }))
      .mockResolvedValueOnce(json(200, { data: { role: 'CUSTOMER' } }));
    vi.stubGlobal('fetch', fetch);
    const res = await GET(request());
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
  });

  it('sends staff to their own dashboard instead of back into /admin', async () => {
    vi.stubGlobal('fetch', refreshedAs('STAFF'));
    const res = await GET(request());
    expect(new URL(res.headers.get('location')!).pathname).toBe('/ops');
  });

  it.each(['STAFF', 'ADMIN'])('lets %s back into /ops', async (role) => {
    vi.stubGlobal('fetch', refreshedAs(role));
    const res = await GET(request('refreshToken=rt_1', '/ops/orders'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/ops/orders');
  });

  it('sends a customer home instead of into /ops', async () => {
    vi.stubGlobal('fetch', refreshedAs('CUSTOMER'));
    const res = await GET(request('refreshToken=rt_1', '/ops'));
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiUnavailableError, fetchList } from './api-fetch';

/**
 * fetchList must never turn an outage into an empty list: an empty render is
 * cached like a real page (the 2026-10-20 empty /occasions incident). These
 * pin that only a real list comes back, and everything else throws.
 */

const URL = 'https://api.example.test/api/v1/occasions';

const respond = (status: number, body?: unknown) =>
  vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('fetchList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the list the API sent', async () => {
    vi.stubGlobal('fetch', respond(200, { success: true, data: [{ slug: 'birthday' }] }));
    await expect(fetchList(URL)).resolves.toEqual([{ slug: 'birthday' }]);
  });

  it('returns a genuinely empty list, so a real empty state still renders', async () => {
    vi.stubGlobal('fetch', respond(200, { success: true, data: [] }));
    await expect(fetchList(URL)).resolves.toEqual([]);
  });

  it('throws on a 5xx instead of returning [] (after retrying once)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = respond(502);
    vi.stubGlobal('fetch', fetch);
    await expect(fetchList(URL)).rejects.toBeInstanceOf(ApiUnavailableError);
    expect(fetch).toHaveBeenCalledTimes(2);
  }, 10_000);

  it('throws when the API cannot be reached at all', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await expect(fetchList(URL)).rejects.toBeInstanceOf(ApiUnavailableError);
  }, 10_000);

  it('treats a 404 on a list endpoint as a fault, not as "nothing here"', async () => {
    vi.stubGlobal('fetch', respond(404, { success: false }));
    await expect(fetchList(URL)).rejects.toThrow(/404 for a list/);
  });

  it('throws when the response is not a list', async () => {
    vi.stubGlobal('fetch', respond(200, { success: true, data: { occasions: [] } }));
    await expect(fetchList(URL)).rejects.toThrow(/not a list/);
  });
});

describe('the trusted-server header and rate limits', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.resetModules();
  });

  it('identifies this server to the API when the shared secret is set', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'a-shared-secret-of-length');
    const fetch = respond(200, { success: true, data: [] });
    vi.stubGlobal('fetch', fetch);
    await fetchList(URL);
    const headers = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers['x-luvngift-server']).toBe('a-shared-secret-of-length');
  });

  it('sends nothing when the secret is not set', async () => {
    vi.stubEnv('REVALIDATE_SECRET', '');
    const fetch = respond(200, { success: true, data: [] });
    vi.stubGlobal('fetch', fetch);
    await fetchList(URL);
    const headers = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers).not.toHaveProperty('x-luvngift-server');
  });

  it('at build, waits out a 429 and tries again instead of failing the deploy', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.resetModules();
    const { fetchList: buildFetchList } = await import('./api-fetch');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'retry-after': '1' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ slug: 'birthday' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    vi.useFakeTimers();
    const result = buildFetchList(URL);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual([{ slug: 'birthday' }]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('at runtime, does not keep a visitor waiting on a 429', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = respond(429);
    vi.stubGlobal('fetch', fetch);
    await expect(fetchList(URL)).rejects.toBeInstanceOf(ApiUnavailableError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

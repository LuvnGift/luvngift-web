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

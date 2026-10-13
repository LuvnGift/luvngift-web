/**
 * Server-side fetching for pages that can render a 404.
 *
 * THE BUG THIS FIXES
 * ------------------
 * `catch { return null }` makes "the API is down" indistinguishable from "this
 * product doesn't exist", and the page then calls `notFound()`. A 404 render is
 * a perfectly valid page as far as Next's caching is concerned, so it gets
 * stored — and a momentary API blip becomes a persistent 404 on a real product:
 *
 *  - At BUILD time (Vercel prerendering these routes): the 404 is baked into
 *    the build output and survives until the next revalidation. This is why it
 *    shows up right after a deploy — Vercel fires many parallel requests at a
 *    possibly cold Railway instance.
 *  - At RUNTIME: Next serves the cached 404 while revalidating in the
 *    background. That background call succeeds (a 200 in the Railway logs)
 *    while the visitor still sees a 404. The two are different requests.
 *  - Googlebot reads a 404 on a product page as "gone" and will deindex it. A
 *    5xx it simply retries.
 *
 * So: ONLY a genuine 404 from the API means "missing". Anything else throws —
 * errors are not cached, and at build time they fail loudly instead of silently
 * shipping a 404.
 */

/** Railway can be slow to wake; don't let one cold start hang a render. */
const TIMEOUT_MS = 10_000;

/** One retry absorbs a cold start, which is the common trigger here. */
const RETRY_DELAY_MS = 1_500;

export class ApiUnavailableError extends Error {
  constructor(url: string, cause: string) {
    super(`API unavailable for ${url}: ${cause}`);
    this.name = 'ApiUnavailableError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Correlation id for the render → API hop.
 *
 * This is the boundary that made the 404 incident hard to explain: Railway
 * logged a 200 while the visitor saw a 404, and nothing proved the two were or
 * were not the same request. The API echoes this id and logs it, so a bad
 * render can now be traced to the exact upstream call — including at build
 * time, where `vercel-build` identifies the prerender pass that produced it.
 */
function renderRequestId(): string {
  const scope = process.env.VERCEL_ENV === undefined ? 'local' : 'vercel-build';
  return `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function attempt(url: string, init?: RequestInit): Promise<Response> {
  const requestId = renderRequestId();
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...init,
    headers: { ...(init?.headers ?? {}), 'x-request-id': requestId },
  });

  // A failed render is the thing we could not see before. Log it where it
  // happens, with the id the API logged on its side.
  if (!res.ok && res.status !== 404) {
    console.error(`[api-fetch] ${url} -> HTTP ${res.status} [request-id: ${requestId}]`);
  }
  return res;
}

/**
 * Returns the response `data`, or `null` only when the API genuinely answered
 * 404. Throws `ApiUnavailableError` for timeouts, network errors and 5xx.
 */
export async function fetchResourceOrNull<T>(
  url: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<T | null> {
  let lastCause = 'unknown';

  for (let i = 0; i < 2; i++) {
    if (i > 0) await sleep(RETRY_DELAY_MS);

    let res: Response;
    try {
      res = await attempt(url, init);
    } catch (err) {
      lastCause = (err as Error)?.message ?? 'network error';
      console.error(`[api-fetch] ${url} -> ${lastCause} (attempt ${i + 1}/2)`);
      continue; // network/timeout — worth one retry
    }

    if (res.status === 404) return null; // the only real "missing"
    if (res.ok) {
      const json = await res.json();
      return (json?.data ?? null) as T | null;
    }

    lastCause = `HTTP ${res.status}`;
    if (res.status < 500) break; // 4xx won't fix itself; don't retry
  }

  throw new ApiUnavailableError(url, lastCause);
}

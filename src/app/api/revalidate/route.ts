import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * Cache purge endpoint, called by the API after an admin mutation.
 *
 * Catalogue pages carry a long time-based fallback (1 hour); this is what makes
 * an admin edit show up immediately instead of waiting for it. Time-based
 * expiry stays as a safety net for anything a purge misses.
 *
 * Guarded by a shared secret — without it, anyone could force-purge the cache
 * repeatedly and push load onto the API, which is exactly what caching prevents.
 */

export const dynamic = 'force-dynamic';

const MAX_TAGS = 50;

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;

  // Fail closed. An unset secret must not mean "anyone may purge".
  if (!secret) {
    console.error('[revalidate] REVALIDATE_SECRET is not set — refusing to revalidate');
    return NextResponse.json({ success: false, error: 'Not configured' }, { status: 503 });
  }

  if (req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let tags: unknown;
  try {
    ({ tags } = await req.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(tags) || tags.length === 0 || tags.length > MAX_TAGS) {
    return NextResponse.json(
      { success: false, error: `tags must be an array of 1–${MAX_TAGS} strings` },
      { status: 400 },
    );
  }

  const valid = tags.filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length <= 100);
  valid.forEach((tag) => revalidateTag(tag));

  console.info(`[revalidate] purged ${valid.length} tag(s): ${valid.join(', ')}`);
  return NextResponse.json({ success: true, revalidated: valid });
}

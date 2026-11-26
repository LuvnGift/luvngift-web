import type { Metadata } from 'next';
import { UnsubscribeClient } from './unsubscribe-client';

/**
 * Where the weekly email's "Unsubscribe" link lands. No sign-in: the token in
 * the path identifies the email it came from, and it can only unsubscribe.
 * Mail clients' own one-click button POSTs to the API directly (RFC 8058).
 *
 * `noindex` and `no-referrer` because the URL carries the token; it is also
 * disallowed in `robots.ts`. Dynamic: never cache a page keyed by a token.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <UnsubscribeClient token={token} />;
}

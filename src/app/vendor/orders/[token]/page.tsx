import type { Metadata } from 'next';
import { VendorOrderClient } from './vendor-order-client';

/**
 * The vendor's view of one assigned order, opened from the link in their
 * assignment email or SMS. There is no login — the token in the path IS the
 * credential.
 *
 * `noindex, nofollow` is not optional. The URL contains a working credential,
 * so it must never reach a search index, and `nofollow` stops a crawler that
 * somehow receives the link from walking anything from it. `/vendor/` is also
 * disallowed in `robots.ts`, but robots.txt is a request and a meta tag is
 * honoured by the crawler that already fetched the page.
 *
 * Rendered dynamically on purpose: there is nothing to prerender, and caching
 * a page keyed by a credential would be a mistake.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order details',
  robots: { index: false, follow: false, nocache: true },
};

export default async function VendorOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <VendorOrderClient token={token} />;
}

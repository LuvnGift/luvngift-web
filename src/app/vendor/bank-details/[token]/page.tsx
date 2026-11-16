import type { Metadata } from 'next';
import { BankDetailsClient } from './bank-details-client';

/**
 * A partner adds or changes the bank account we pay them into, from the
 * one-time link we emailed and texted them. There is no login: the token in
 * the path IS the credential, and it works once.
 *
 * `noindex, nofollow` and `no-referrer` are not optional. The URL carries a
 * working credential, so it must never reach a search index or another site's
 * logs through the Referer header. `/vendor/bank-details/` is also disallowed
 * in `robots.ts`.
 *
 * Rendered dynamically: caching a page keyed by a credential would be a mistake.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your bank details',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default async function BankDetailsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <BankDetailsClient token={token} />;
}

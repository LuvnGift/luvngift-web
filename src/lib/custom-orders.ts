import type { QuoteStatus } from '@luvngift/shared';

/**
 * How the custom gift conversation is worded on the site. The types, limits,
 * schemas and rules are in @luvngift/shared (the API and the app use them
 * too); only this page copy is the web's own.
 */

/** Customer-facing wording for where their request is. */
export const CUSTOMER_STAGE: Record<QuoteStatus, string> = {
  AWAITING_QUOTE: 'We are pricing your request',
  QUOTED: 'Your quote is ready',
  CHANGES_REQUESTED: 'We are revising your quote',
  ACCEPTED: 'Quote accepted',
  DECLINED: 'Quote declined',
};

/** Admin-facing wording: what, if anything, is waiting on us. */
export const ADMIN_STAGE: Record<QuoteStatus, { label: string; className: string }> = {
  AWAITING_QUOTE: { label: 'Needs quote', className: 'bg-purple-100 text-purple-800' },
  QUOTED: { label: 'Quote sent', className: 'bg-sky-100 text-sky-800' },
  CHANGES_REQUESTED: { label: 'Changes requested', className: 'bg-amber-100 text-amber-900' },
  ACCEPTED: { label: 'Quote accepted', className: 'bg-green-100 text-green-800' },
  DECLINED: { label: 'Quote declined — re-quote or cancel', className: 'bg-rose-100 text-rose-800' },
};

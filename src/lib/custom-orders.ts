import { z } from 'zod';

/**
 * Types and client-side schemas for the custom gift request conversation.
 *
 * Local rather than in `@luvngift/shared` (as with careers/roadmap): mobile does
 * not drive this flow, so adding it there would gate a web deploy on a package
 * publish. The API side is `luvngift-api/src/modules/custom-orders/` — keep the
 * limits here in step with `custom-orders.validation.ts`, or a value the form
 * accepts comes back as an opaque 400.
 */

export type QuoteStatus =
  | 'AWAITING_QUOTE'
  | 'QUOTED'
  | 'CHANGES_REQUESTED'
  | 'ACCEPTED'
  | 'DECLINED';

export type QuoteResponse = 'PENDING' | 'ACCEPTED' | 'CHANGES_REQUESTED' | 'DECLINED' | 'SUPERSEDED';

export interface CustomOrderQuote {
  id: string;
  round: number;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  scope: string;
  note: string | null;
  isFinal: boolean;
  response: QuoteResponse;
  customerComment: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface OrderMessage {
  id: string;
  author: 'CUSTOMER' | 'ADMIN';
  body: string;
  createdAt: string;
}

export interface OrderConversation {
  quoteStatus: QuoteStatus;
  quotes: CustomOrderQuote[];
  messages: OrderMessage[];
  /** Admin view only: the buyer's tax rate, so a quote can be previewed. */
  tax?: { rate: number; label: string };
}

/** Same rounding as the API's `calculateTax`. */
export function taxOn(subtotal: number, rate: number): number {
  return Math.round(subtotal * rate);
}

export type QuoteAction = 'ACCEPT' | 'REQUEST_CHANGES' | 'DECLINE';

export const MESSAGE_MAX = 2000;

export const orderMessageSchema = z.object({
  body: z.string().trim().min(1, 'Write a message first').max(MESSAGE_MAX),
});

export const requestChangesSchema = z.object({
  comment: z.string().trim().min(3, 'Tell us what you would like changed').max(MESSAGE_MAX),
});

/** The quote round the customer can act on, if any. */
export function openQuote(conversation: OrderConversation): CustomOrderQuote | null {
  if (conversation.quoteStatus !== 'QUOTED') return null;
  const latest = conversation.quotes[conversation.quotes.length - 1];
  return latest?.response === 'PENDING' ? latest : null;
}

/** The accepted quote, if the price has been agreed. */
export function acceptedQuote(conversation: OrderConversation): CustomOrderQuote | null {
  return conversation.quotes.find((q) => q.response === 'ACCEPTED') ?? null;
}

/** One stream of messages and quote events, oldest first. */
export type TimelineEntry =
  | { kind: 'message'; at: string; message: OrderMessage }
  | { kind: 'quote'; at: string; quote: CustomOrderQuote }
  | { kind: 'response'; at: string; quote: CustomOrderQuote };

export function buildTimeline(conversation: OrderConversation): TimelineEntry[] {
  const entries: TimelineEntry[] = conversation.messages.map((message) => ({
    kind: 'message',
    at: message.createdAt,
    message,
  }));
  for (const quote of conversation.quotes) {
    entries.push({ kind: 'quote', at: quote.createdAt, quote });
    if (quote.respondedAt) entries.push({ kind: 'response', at: quote.respondedAt, quote });
  }
  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

export function formatMoney(cents: number, currency: string): string {
  return `${SYMBOLS[currency] ?? `${currency} `}${(cents / 100).toFixed(2)}`;
}

/** Customer-facing wording for where their request is. */
export const CUSTOMER_STAGE: Record<QuoteStatus, string> = {
  AWAITING_QUOTE: 'We are pricing your request',
  QUOTED: 'Your quote is ready',
  CHANGES_REQUESTED: 'We are revising your quote',
  ACCEPTED: 'Quote accepted',
  DECLINED: 'Request declined',
};

/** Admin-facing wording: what, if anything, is waiting on us. */
export const ADMIN_STAGE: Record<QuoteStatus, { label: string; className: string }> = {
  AWAITING_QUOTE: { label: 'Needs quote', className: 'bg-purple-100 text-purple-800' },
  QUOTED: { label: 'Quote sent', className: 'bg-sky-100 text-sky-800' },
  CHANGES_REQUESTED: { label: 'Changes requested', className: 'bg-amber-100 text-amber-900' },
  ACCEPTED: { label: 'Quote accepted', className: 'bg-green-100 text-green-800' },
  DECLINED: { label: 'Quote declined', className: 'bg-gray-100 text-gray-700' },
};

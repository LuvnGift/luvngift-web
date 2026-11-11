/**
 * Admin orders list: tabs, search and sort, kept in the URL so a refresh, the
 * back button or a shared link lands on the same view.
 *
 * The tabs are ORDER_TABS in @luvngift/shared (the API decides what each
 * holds); this file only labels them, in the API's order.
 */

import { ORDER_TABS as SHARED_TABS, type OrderSort, type OrderTab } from '@luvngift/shared';

export type { OrderSort, OrderTab };

const LABELS: Record<OrderTab, string> = {
  'needs-action': 'Needs action',
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  closed: 'Cancelled / Refunded',
  all: 'All',
};

export const ORDER_TABS = SHARED_TABS.map((id) => ({ id, label: LABELS[id] }));

export interface OrderListParams {
  tab: OrderTab;
  q: string;
  sort: OrderSort;
  page: number;
}

/** What ops sees first: the work waiting on them. */
export const DEFAULT_TAB: OrderTab = 'needs-action';

const TAB_IDS = new Set<string>(ORDER_TABS.map((t) => t.id));

/** Reads the list state from the URL, ignoring anything malformed. */
export function parseOrderListParams(params: { get(name: string): string | null }): OrderListParams {
  const tab = params.get('tab');
  const page = Number(params.get('page'));
  return {
    tab: tab && TAB_IDS.has(tab) ? (tab as OrderTab) : DEFAULT_TAB,
    q: (params.get('q') ?? '').slice(0, 100),
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/**
 * Writes list state back into the URL, keeping unrelated params (such as the
 * `?order=` deep link) and leaving defaults out so the URL stays short.
 */
export function withOrderListParams(
  current: string,
  next: Partial<OrderListParams>,
): string {
  const params = new URLSearchParams(current);
  const set = (key: string, value: string | number | undefined, fallback: string | number) => {
    if (value === undefined) return;
    if (String(value) === String(fallback) || value === '') params.delete(key);
    else params.set(key, String(value));
  };
  set('tab', next.tab, DEFAULT_TAB);
  set('q', next.q, '');
  set('sort', next.sort, 'newest');
  set('page', next.page, 1);
  return params.toString();
}

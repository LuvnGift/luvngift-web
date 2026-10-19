/**
 * Admin orders list: tabs, search and sort, kept in the URL so a refresh, the
 * back button or a shared link lands on the same view.
 *
 * Mirrors `ORDER_TABS` in `luvngift-api/src/modules/admin/order-list.ts` — the
 * API decides what each tab contains; this file only names and orders them.
 */

export const ORDER_TABS = [
  { id: 'needs-action', label: 'Needs action' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'closed', label: 'Cancelled / Refunded' },
  { id: 'all', label: 'All' },
] as const;

export type OrderTab = (typeof ORDER_TABS)[number]['id'];
export type OrderSort = 'newest' | 'oldest';

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

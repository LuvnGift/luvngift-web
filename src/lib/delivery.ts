/**
 * Delivery expectations are promised as a **range**, never a single day —
 * Nigerian logistics make an exact date a promise we can't reliably keep.
 *
 * A bundle's `estimatedDeliveryDays` is the lead time; the platform-wide
 * `DELIVERY_WINDOW_DAYS` (Admin → Settings) widens it into the range. That's the
 * same lead + window model subscription cycles use.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface DeliveryWindow {
  leadDays: number;
  windowDays: number;
}

export const DEFAULT_DELIVERY_WINDOW: DeliveryWindow = { leadDays: 3, windowDays: 5 };

/** Server-side fetch for storefront pages. Falls back rather than breaking a page. */
export async function fetchDeliveryWindow(): Promise<DeliveryWindow> {
  try {
    const res = await fetch(`${API_URL}/api/v1/settings/delivery-window`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return DEFAULT_DELIVERY_WINDOW;
    const json = await res.json();
    return json.data ?? DEFAULT_DELIVERY_WINDOW;
  } catch {
    return DEFAULT_DELIVERY_WINDOW;
  }
}

/**
 * Relative form for catalogue pages: "7–12 days".
 *
 * Deliberately NOT absolute dates here — bundle and occasion pages are cached
 * (`revalidate: 300`), so a baked-in date would still be on screen after the day
 * rolls over. Absolute dates are only used once an order exists and its window
 * is pinned.
 */
export function formatDeliveryRange(leadDays: number, windowDays: number): string {
  if (!Number.isFinite(leadDays) || leadDays <= 0) return 'Delivery time varies';
  const end = leadDays + Math.max(0, windowDays);
  return end > leadDays ? `${leadDays}–${end} days` : `${leadDays} days`;
}

/** Absolute form for a placed order: "12–17 August". */
export function formatDeliveryDates(from: string | Date, windowDays: number): string {
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, windowDays));

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const startLabel = start.toLocaleDateString(
    'en-GB',
    sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'long' },
  );
  return `${startLabel}–${endLabel}`;
}

/**
 * Delivery window formatting.
 *
 * Delivery promises are always a *range*, never a single day. A bundle's
 * `estimatedDeliveryDays` is the lead time; `deliveryWindowDays` widens it.
 *
 * IMPORTANT: `deliveryWindowDays` arrives **embedded in the bundle/occasion API
 * payload** — never fetch it separately from a page. Catalogue routes are
 * prerendered, so a second fetch there means an extra request per bundle per
 * Vercel build, loading Railway exactly when a cold start would turn into a bad
 * render.
 */

/** Relative form for catalogue pages: "7–12 days". */
export function formatDeliveryRange(leadDays: number, windowDays = 0): string {
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

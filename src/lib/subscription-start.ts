/**
 * Display helpers for a subscription's start. The API decides the rule
 * (subscription-start.ts there); these only preview it, so the date picker can
 * say "first charge around …" before anything is created.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mirrors the API: a first charge closer than this is taken at once. */
export const MIN_DEFERRAL_HOURS = 48;

/** Midnight UTC of a YYYY-MM-DD date. */
function utcDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/**
 * When the first charge will be taken for a chosen first delivery date, or
 * null when it will be taken now. Charges happen at 09:00 UTC.
 */
export function previewChargeDate(firstDeliveryDate: string, leadDays: number, now: Date = new Date()): Date | null {
  const chargeAt = new Date(utcDay(firstDeliveryDate).getTime() - leadDays * DAY_MS + 9 * 60 * 60 * 1000);
  return chargeAt.getTime() - now.getTime() < MIN_DEFERRAL_HOURS * 60 * 60 * 1000 ? null : chargeAt;
}

/** "17 December 2026". Calendar dates are UTC days, so format them in UTC. */
export function longDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

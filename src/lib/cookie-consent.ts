// Lightweight, dependency-free cookie consent.
// 'all'       → user accepted non-essential cookies (e.g. analytics)
// 'essential' → only strictly necessary cookies (auth/session, Stripe, etc.)
export type ConsentValue = 'all' | 'essential';

const COOKIE_NAME = 'cookie_consent';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year
export const CONSENT_EVENT = 'cookie-consent-change';

export function getConsent(): ConsentValue | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)cookie_consent=(all|essential)/);
  return (match?.[1] as ConsentValue) ?? null;
}

export function setConsent(value: ConsentValue): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
  // Let listeners (e.g. an analytics loader) react without a page reload.
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: value }));
}

/** Has the user consented to non-essential (analytics/marketing) cookies? */
export function hasAnalyticsConsent(): boolean {
  return getConsent() === 'all';
}

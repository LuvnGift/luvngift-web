'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { CONSENT_EVENT, hasAnalyticsConsent, type ConsentValue } from '@/lib/cookie-consent';

/**
 * Loads Vercel Analytics and Speed Insights only after the visitor accepts
 * non-essential cookies. They used to load unconditionally, so the banner's
 * "Reject non-essential" recorded a choice that nothing honoured.
 *
 * Withdrawing consent reloads the page: the scripts are already injected and
 * unmounting this component would not remove them.
 */
export function ConsentedAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Whether the scripts have been injected during this page's lifetime.
    let loaded = hasAnalyticsConsent();
    setAllowed(loaded);

    const onChange = (e: Event) => {
      const granted = (e as CustomEvent<ConsentValue>).detail === 'all';
      if (granted) {
        loaded = true;
        setAllowed(true);
      } else if (loaded) {
        window.location.reload();
      }
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!allowed) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

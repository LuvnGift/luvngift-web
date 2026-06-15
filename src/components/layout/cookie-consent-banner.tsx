'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getConsent, setConsent, type ConsentValue } from '@/lib/cookie-consent';

/**
 * Lightweight cookie consent banner. Shows once until the visitor makes a choice.
 * Choice is stored in the `cookie_consent` cookie; analytics/marketing scripts
 * should be gated behind `hasAnalyticsConsent()` from '@/lib/cookie-consent'.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no decision has been recorded yet.
    if (!getConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (value: ConsentValue) => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use essential cookies to run Luvngift and, with your consent, analytics cookies to improve it.
          See our{' '}
          <Link href="/cookie-policy" className="font-medium text-foreground underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => choose('essential')}>
            Reject non-essential
          </Button>
          <Button size="sm" onClick={() => choose('all')}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

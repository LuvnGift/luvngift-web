'use client';

import { openConsentSettings } from '@/lib/cookie-consent';

/** Footer link that reopens the cookie banner. A client island in a server footer. */
export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className="hover:text-foreground transition-colors text-left"
    >
      Cookie settings
    </button>
  );
}

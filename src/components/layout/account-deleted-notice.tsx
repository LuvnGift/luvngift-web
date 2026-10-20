'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Confirms a completed account deletion. The delete flow ends with a hard
 * navigation to `/?account=deleted` (so nothing authenticated survives in the
 * client), which means the confirmation has to be raised from here.
 */
export function AccountDeletedNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('account') !== 'deleted') return;
    toast.success('Your account has been deleted. We have emailed you a confirmation.');
    url.searchParams.delete('account');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);

  return null;
}

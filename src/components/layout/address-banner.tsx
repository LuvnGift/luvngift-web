'use client';

import Link from 'next/link';
import { MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { useMe } from '@/hooks/use-auth';

export function AddressBanner() {
  const { data: user, isLoading } = useMe();
  const [dismissed, setDismissed] = useState(false);

  // Don't show while loading, after dismiss, or if address is already complete
  if (isLoading || dismissed) return null;
  if (!user) return null;
  const hasAddress = !!(user as any).billingStreet && !!(user as any).billingCity && !!user.buyerCountry;
  if (hasAddress) return null;

  const isFirstTime = !user.buyerCountry;
  const href = isFirstTime ? '/setup-location' : '/account';
  const message = isFirstTime
    ? 'Complete your billing address to start placing orders.'
    : 'Your billing address is incomplete. Update it to place orders.';

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{message}</span>
          <Link href={href} className="font-semibold underline underline-offset-2 hover:text-amber-700">
            {isFirstTime ? 'Set up now' : 'Update address'}
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 hover:bg-amber-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

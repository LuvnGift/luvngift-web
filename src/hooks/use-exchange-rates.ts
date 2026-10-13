import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getUserCurrency } from '@luvngift/shared';
import { useAuthStore } from '@/store/auth.store';

interface ExchangeRates { GBP: number; CAD: number }

const FALLBACK_RATES: ExchangeRates = { GBP: 0.79, CAD: 1.36 };

/**
 * Bounded on purpose. Prices render as skeletons until this resolves one way or
 * the other, so a request that merely hangs — a Railway cold start, a flaky
 * connection — leaves every bundle card priceless for as long as it takes.
 * A timeout turns that into a fast `isError`, which falls back to FALLBACK_RATES.
 *
 * Safe to display fallback rates: they are indicative only. Every amount the
 * customer is actually charged is computed server-side from live rates and
 * shown on the review step before payment.
 */
const RATES_TIMEOUT_MS = 4000;

async function fetchRates(): Promise<ExchangeRates> {
  const res = await api.get<{ data: ExchangeRates }>('/api/v1/exchange-rates', {
    timeout: RATES_TIMEOUT_MS,
  });
  return res.data.data;
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: fetchRates,
    staleTime: 60 * 60 * 1000,
    // No placeholderData — we never want to show a price based on guessed rates
    // and then change it when real rates arrive. Show skeleton until rates are known.
    //
    // One retry, not the default three: each attempt costs a full timeout, and
    // the point of the timeout is to stop the skeleton outlasting the visitor's
    // patience. Worst case is now ~8s rather than unbounded.
    retry: 1,
  });
}

/** Returns the user's currency and a function to convert a USD-cent amount to their currency.
 *  `ready` is false until both the component has mounted (Zustand rehydrated) AND real
 *  exchange rates have loaded from the API. Callers must show a skeleton when ready is false
 *  to avoid showing a price that changes when rates arrive. */
export function useUserCurrency() {
  const { user, isAuthenticated } = useAuthStore();
  const { data: rates, isSuccess, isError } = useExchangeRates();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const currency = getUserCurrency(user?.buyerCountry);

  const convert = (usdCents: number): number => {
    const r = rates ?? (isError ? FALLBACK_RATES : null);
    if (!r) return usdCents;
    if (currency === 'GBP') return Math.round(usdCents * r.GBP);
    if (currency === 'CAD') return Math.round(usdCents * r.CAD);
    return usdCents;
  };

  // If authenticated but user hasn't loaded yet from useMe(), buyerCountry is
  // unknown — show skeleton to avoid showing USD price that flips to CAD/GBP.
  const userReady = !isAuthenticated || user !== null;
  const ready = mounted && (isSuccess || isError) && userReady;

  return { currency, convert, ready };
}

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getUserCurrency } from '@luvngift/shared';
import { useAuthStore } from '@/store/auth.store';

interface ExchangeRates { GBP: number; CAD: number }

const FALLBACK_RATES: ExchangeRates = { GBP: 0.79, CAD: 1.36 };

async function fetchRates(): Promise<ExchangeRates> {
  const res = await api.get<{ data: ExchangeRates }>('/api/v1/exchange-rates');
  return res.data.data;
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: fetchRates,
    staleTime: 60 * 60 * 1000,
    // No placeholderData — we never want to show a price based on guessed rates
    // and then change it when real rates arrive. Show skeleton until rates are known.
  });
}

/** Returns the user's currency and a function to convert a USD-cent amount to their currency.
 *  `ready` is false until both the component has mounted (Zustand rehydrated) AND real
 *  exchange rates have loaded from the API. Callers must show a skeleton when ready is false
 *  to avoid showing a price that changes when rates arrive. */
export function useUserCurrency() {
  const { user } = useAuthStore();
  const { data: rates, isSuccess, isError } = useExchangeRates();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const currency = getUserCurrency(user?.buyerCountry);

  const convert = (usdCents: number): number => {
    // Use real rates when available; use hardcoded fallback only when the API has
    // definitively failed (isError) — never while still loading.
    const r = rates ?? (isError ? FALLBACK_RATES : null);
    if (!r) return usdCents;
    if (currency === 'GBP') return Math.round(usdCents * r.GBP);
    if (currency === 'CAD') return Math.round(usdCents * r.CAD);
    return usdCents;
  };

  // ready = mounted (Zustand hydrated) AND rates have settled (success or error — no more changes)
  const ready = mounted && (isSuccess || isError);

  return { currency, convert, ready };
}

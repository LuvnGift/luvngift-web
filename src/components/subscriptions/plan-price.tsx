'use client';

import { useUserCurrency } from '@/hooks/use-exchange-rates';
import { OFFERED_INTERVALS, cycleWord, cadenceLabel, type Interval } from '@/lib/cadence';

export interface PlanPriceRow {
  interval: Interval;
  currency: string;
  amount: number;
}

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: 'US$', GBP: '£' };
const format = (row: PlanPriceRow) =>
  `${SYMBOLS[row.currency] ?? row.currency}${(row.amount / 100).toFixed(2)}`;

/**
 * The price row a buyer will actually be charged: the one in their currency
 * (the API charges getUserCurrency(buyerCountry): CAD, GBP, else USD). Never
 * converted in the browser. Showing the first row regardless of currency let a
 * Canadian see a US$ figure and then be charged a different CA$ one.
 */
export function pickPrice(
  prices: PlanPriceRow[],
  interval: PlanPriceRow['interval'],
  currency: string,
): PlanPriceRow | undefined {
  return prices.find((p) => p.interval === interval && p.currency === currency);
}

/** Headline price for a plan card. A placeholder until the buyer's currency is known. */
export function PlanPrice({ prices }: { prices: PlanPriceRow[] }) {
  const { currency, ready } = useUserCurrency();
  if (!ready) return <span className="inline-block h-8 w-32 animate-pulse rounded bg-muted" aria-hidden="true" />;

  // Headline the most frequent cadence on sale; name the others beneath it.
  const offered = OFFERED_INTERVALS.map((i) => pickPrice(prices, i, currency)).filter(
    (p): p is PlanPriceRow => Boolean(p),
  );
  const [main, ...others] = offered;
  if (!main) return <span>—</span>;

  return (
    <>
      <span className="text-2xl font-bold">
        {format(main)}
        <span className="text-sm font-normal text-muted-foreground"> / {cycleWord(main.interval)}</span>
      </span>
      {others.length > 0 && (
        <span className="block text-xs text-muted-foreground mt-0.5">
          Also {others.map((o) => cadenceLabel(o.interval)).join(' or ')}
        </span>
      )}
    </>
  );
}

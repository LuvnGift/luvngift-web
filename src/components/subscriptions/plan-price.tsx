'use client';

import { useUserCurrency } from '@/hooks/use-exchange-rates';
import { OFFERED_INTERVALS, cycleWord, cadenceLabel, type SubscriptionInterval as Interval, formatMoney, pickPrice, type SubscriptionPrice } from '@luvngift/shared';

export type PlanPriceRow = Pick<SubscriptionPrice, 'interval' | 'currency' | 'amount' | 'billing'>;

const format = (row: PlanPriceRow) => formatMoney(row.amount, row.currency);

/** The row a buyer is charged (rule in @luvngift/shared). Re-exported for this file's importers. */
export { pickPrice };

/** Headline price for a plan card. A placeholder until the buyer's currency is known. */
export function PlanPrice({ prices, annualDiscountPercent }: { prices: PlanPriceRow[]; annualDiscountPercent?: number | null }) {
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
      {annualDiscountPercent ? (
        <span className="block text-xs font-medium text-green-700 mt-0.5">
          Or pay for the year and save {annualDiscountPercent}%
        </span>
      ) : null}
    </>
  );
}

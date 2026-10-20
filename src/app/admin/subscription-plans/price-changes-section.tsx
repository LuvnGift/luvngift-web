'use client';

import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCancelPriceChange, usePlanPriceChanges } from '@/hooks/use-admin';

const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency}`;
const cycle = (interval: 'MONTHLY' | 'BIWEEKLY') => (interval === 'MONTHLY' ? 'month' : '2 weeks');

/**
 * Price changes waiting to reach existing subscribers. They are created by
 * publishing a plan's pricing, never typed in: a hand-entered price would be
 * one nobody could trace back to a sourcing cost and a rate. Cancelling one
 * restores the old price for new sign-ups and emails everyone who was told.
 */
export function PriceChangesSection({ planId }: { planId: string }) {
  const { data: changes = [] } = usePlanPriceChanges(planId);
  const cancel = useCancelPriceChange();
  const pending = changes.filter((c) => !c.appliedAt && !c.cancelledAt);
  if (pending.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {pending.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {c.price.currency} / {cycle(c.price.interval)}: {money(c.oldAmount, c.price.currency)} →{' '}
            <strong>{money(c.newAmount, c.price.currency)}</strong> for existing subscribers from{' '}
            {new Date(c.effectiveAt).toLocaleDateString(undefined, { timeZone: 'UTC' })}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={cancel.isPending}
            onClick={() => {
              if (confirm('Cancel this price change? Subscribers who were told about it will be emailed.')) cancel.mutate(c.id);
            }}
          >
            Cancel change
          </Button>
        </div>
      ))}
    </div>
  );
}

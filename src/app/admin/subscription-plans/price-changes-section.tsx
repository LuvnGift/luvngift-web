'use client';

import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCancelPriceChange, usePlanPriceChanges, useSchedulePriceChange } from '@/hooks/use-admin';

/** Mirrors the API (Terms § 9). */
const INCREASE_NOTICE_DAYS = 30;
/**
 * The API counts 30 × 24h from now, and the picker yields midnight UTC, so the
 * earliest selectable date for an increase is one day later than "today + 30".
 */
const EARLIEST_INCREASE_DAY = INCREASE_NOTICE_DAYS + 1;

interface PlanPrice {
  id: string;
  interval: 'MONTHLY' | 'BIWEEKLY';
  currency: string;
  amount: number;
}

const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency}`;
const cycle = (interval: PlanPrice['interval']) => (interval === 'MONTHLY' ? 'month' : '2 weeks');
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const daysFromToday = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
};

/**
 * Scheduled price changes for one plan. New subscribers pay a scheduled price
 * at once; existing ones are emailed now and moved on the effective date.
 */
export function PriceChangesSection({ planId, prices }: { planId: string; prices: PlanPrice[] }) {
  const { data: changes = [] } = usePlanPriceChanges(planId);
  const cancel = useCancelPriceChange();
  const [open, setOpen] = useState(false);
  const pending = changes.filter((c) => !c.appliedAt && !c.cancelledAt);

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
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
        Change a price
      </Button>
      {open && <SchedulePriceChangeDialog prices={prices} pendingPriceIds={pending.map((c) => c.priceId)} onClose={() => setOpen(false)} />}
    </div>
  );
}

function SchedulePriceChangeDialog({
  prices,
  pendingPriceIds,
  onClose,
}: {
  prices: PlanPrice[];
  pendingPriceIds: string[];
  onClose: () => void;
}) {
  const schedule = useSchedulePriceChange();
  const available = prices.filter((p) => !pendingPriceIds.includes(p.id));
  const [priceId, setPriceId] = useState(available[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(daysFromToday(EARLIEST_INCREASE_DAY));

  const price = available.find((p) => p.id === priceId);
  const cents = Math.round(parseFloat(amount || '0') * 100);
  const increase = !!price && cents > price.amount;
  const minDate = increase ? daysFromToday(EARLIEST_INCREASE_DAY) : daysFromToday(1);
  const valid = useMemo(
    () => !!price && cents > 0 && cents !== price.amount && date >= minDate,
    [price, cents, date, minDate],
  );

  if (available.length === 0) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Every price already has a change scheduled</DialogTitle>
            <DialogDescription>Cancel the scheduled change first if you need a different one.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !schedule.isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change a subscription price</DialogTitle>
          <DialogDescription>
            New subscribers pay the new price straight away. Existing subscribers are emailed now and
            move to it on the date you choose. An increase needs at least {INCREASE_NOTICE_DAYS} days&apos; notice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Price</Label>
          <Select value={priceId} onValueChange={setPriceId}>
            <SelectTrigger aria-label="Price to change"><SelectValue /></SelectTrigger>
            <SelectContent>
              {available.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.currency} every {cycle(p.interval)}: {money(p.amount, p.currency)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-price">New price ({price?.currency})</Label>
          <Input id="new-price" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="effective-date">Effective for existing subscribers from</Label>
          <Input id="effective-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
          {date < minDate && (
            <p className="text-xs text-destructive">
              {increase ? `An increase needs ${INCREASE_NOTICE_DAYS} days' notice — the earliest date is ${minDate}.` : 'Choose a future date.'}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={schedule.isPending}>Cancel</Button>
          <Button
            disabled={!valid || schedule.isPending}
            onClick={() => schedule.mutate({ priceId, newAmount: cents, effectiveAt: `${date}T00:00:00.000Z` }, { onSuccess: onClose })}
          >
            {schedule.isPending ? <Spinner size="sm" className="mr-2" /> : null}
            Schedule and notify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

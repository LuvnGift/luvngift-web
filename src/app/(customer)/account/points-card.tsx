'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  usePoints,
  useApplyPoints,
  useUndoPoints,
  useMySubscriptions,
  type PointsSummary,
  type Subscription,
} from '@/hooks/use-subscriptions';
import { useUserCurrency } from '@/hooks/use-exchange-rates';
import { formatPoints, pointsValue, formatMoney } from '@luvngift/shared';
import { longDate } from '@luvngift/shared';

// Every price is written one way, everywhere (formatMoney in @luvngift/shared).
const money = formatMoney;

const KIND_LABEL: Record<PointsSummary['history'][number]['kind'], string> = {
  EARNED: 'Earned',
  REDEEMED: 'Used',
  FORFEITED: 'Removed',
};

/**
 * Points: a thank-you for a box not filled to the top. Shown above the
 * subscriptions they come from, with the rules in plain words: how they are
 * earned, that they expire, and that cancelling removes them.
 */
export function PointsCard() {
  const { data: points, isLoading } = usePoints();
  const { data: subs } = useMySubscriptions();
  const { currency } = useUserCurrency();
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-6"><Spinner /></CardContent>
      </Card>
    );
  }
  if (!points) return null;

  const usable = (subs ?? []).filter((s) => s.status !== 'CANCELLED' && !s.cancelAtPeriodEnd);
  // Nothing to show to someone who has never had points and has no subscription to earn them on.
  if (points.balance === 0 && points.history.length === 0 && usable.length === 0) return null;

  const { pointsPerStep, stepPercent } = points.earnRule;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle>Your points</CardTitle>
        </div>
        <CardDescription>
          A thank-you when your box isn&apos;t filled to the top: {pointsPerStep} points for every {stepPercent}% left
          unfilled, each delivery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-bold">{formatPoints(points.balance)}</span>
          <span className="text-sm text-muted-foreground">
            points
            {points.balance > 0 && <> · worth {money(pointsValue(points.balance, points.pointsPerCurrencyUnit), currency)}</>}
          </span>
        </div>

        {points.expiringSoon.points > 0 && points.expiringSoon.firstOn && (
          <p className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <Clock className="h-4 w-4 shrink-0" />
            {formatPoints(points.expiringSoon.points)} points expire on {longDate(points.expiringSoon.firstOn)}.
          </p>
        )}

        {usable.length > 0 && (
          <ul className="space-y-2">
            {usable.map((sub) => (
              <UseOnSubscription key={sub.id} sub={sub} points={points} />
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Use at least {formatPoints(points.minRedeem)} at a time, on your next delivery or on any{' '}
          <Link href="/occasions" className="underline underline-offset-2">bundle</Link> at checkout. Points expire 12
          months after you earn them, oldest first, and have no cash value. Points earned on a subscription are removed
          if you cancel it.
        </p>

        {points.history.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showHistory ? 'Hide' : 'Show'} history
            </button>
            {showHistory && (
              <ul className="mt-2 divide-y rounded-md border text-sm">
                {points.history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>
                      <span className="font-medium">{KIND_LABEL[h.kind]}</span>
                      <span className="text-muted-foreground">
                        {' '}· {longDate(h.createdAt)}
                        {h.note ? ` · ${h.note}` : ''}
                      </span>
                    </span>
                    <span className={h.kind === 'EARNED' ? 'text-green-700' : 'text-muted-foreground'}>
                      {h.kind === 'EARNED' ? '+' : '−'}
                      {formatPoints(h.points)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UseOnSubscription({ sub, points }: { sub: Subscription; points: PointsSummary }) {
  const apply = useApplyPoints();
  const undo = useUndoPoints();
  const pending = points.pending.find((p) => p.subscriptionId === sub.id);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(points.balance));
  const n = Number(amount);
  const valid = Number.isInteger(n) && n >= points.minRedeem && n <= points.balance;
  const name = sub.plan?.name ?? 'Subscription';

  if (pending) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-primary/5 px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{name}:</span> {formatPoints(pending.points)} points come off the next charge (
          {money(pointsValue(pending.points, points.pointsPerCurrencyUnit), sub.currency)}).
        </span>
        <Button size="sm" variant="ghost" onClick={() => undo.mutate(sub.id)} disabled={undo.isPending}>
          Undo
        </Button>
      </li>
    );
  }

  if (points.balance < points.minRedeem) return null;

  return (
    <li className="rounded-md border px-3 py-2 text-sm">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">{name}</span>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Use points on the next delivery
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor={`pts-${sub.id}`} className="text-xs text-muted-foreground">
              Points to use on {name} ({formatPoints(points.minRedeem)}–{formatPoints(points.balance)})
            </label>
            <Input
              id={`pts-${sub.id}`}
              type="number"
              min={points.minRedeem}
              max={points.balance}
              step={10}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 w-32"
            />
          </div>
          <Button
            size="sm"
            disabled={!valid || apply.isPending}
            onClick={async () => {
              try {
                await apply.mutateAsync({ id: sub.id, points: n });
                setOpen(false);
              } catch {
                // surfaced by the hook
              }
            }}
          >
            {apply.isPending ? <Spinner size="sm" /> : `Take ${valid ? money(pointsValue(n, points.pointsPerCurrencyUnit), sub.currency) : ''} off`}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}

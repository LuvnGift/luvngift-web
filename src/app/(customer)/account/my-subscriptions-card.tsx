'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Repeat,
  SkipForward,
  PauseCircle,
  PlayCircle,
  XCircle,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  useMySubscriptions,
  useSkipCycle,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  useUpdateSubstitutionPreference,
  hasNotStarted,
  usePoints,
  type Subscription,
  type SubscriptionDelivery,
  type SubscriptionStatus,
  type SubstitutionPreference,
  isCurated,
  fetchCancelQuote,
  type CancelQuote,
  type SubscriptionTermSummary,
} from '@/hooks/use-subscriptions';
import { DietaryEditor } from './dietary-editor';
import { BoxEditor } from './box-editor';
import { longDate, formatMoney } from '@luvngift/shared';
import { formatPoints } from '@luvngift/shared';
import { cycleWord } from '@luvngift/shared';


const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-amber-100 text-amber-800',
  PAST_DUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  PAST_DUE: 'Payment issue',
  CANCELLED: 'Cancelled',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Every price is written one way, everywhere (formatMoney in @luvngift/shared).
const money = formatMoney;

/** The refund, line by line, before anyone confirms (Refund Policy § 6). */
function annualCancelMessage(q: CancelQuote): string {
  const c = q.currency;
  if (q.refund === 0) {
    return `Cancel this plan now? ${q.deliveriesMade} of ${q.deliveries} deliveries have been made, and there is nothing left to refund. You will not be charged again.`;
  }
  return [
    `Cancel this plan now? It ends today and you will not be charged again.`,
    '',
    `${q.undelivered} deliveries not yet made: ${money(q.undeliveredValue, c)}`,
    `Less the ${q.feePercent}% admin fee: -${money(q.fee, c)}`,
    `Less the annual discount on the ${q.deliveriesMade} made: -${money(q.clawback, c)}`,
    `Refund to your card: ${money(q.refund, c)}`,
  ].join('\n');
}

function SubscriptionRow({ sub }: { sub: Subscription }) {
  const skip = useSkipCycle(true);
  const unskip = useSkipCycle(false);
  const pause = usePauseSubscription();
  const resume = useResumeSubscription();
  const cancel = useCancelSubscription();
  const { data: points } = usePoints();
  const updatePreference = useUpdateSubstitutionPreference();

  const busy =
    skip.isPending || unskip.isPending || pause.isPending || resume.isPending || cancel.isPending;
  // What THIS subscriber is charged. The plan's price row can already hold a
  // newer price that only reaches existing subscribers after the notice period.
  const annualSub = (sub as { billing?: string }).billing === 'ANNUAL';
  const year = (sub as { terms?: SubscriptionTermSummary[] }).terms?.[0];
  const amount =
    (sub as { amount?: number | null }).amount ??
    sub.plan.prices?.find(
      (p) => p.interval === sub.interval && p.currency === sub.currency && ((p as { billing?: string }).billing ?? 'PER_DELIVERY') === (annualSub ? 'ANNUAL' : 'PER_DELIVERY'),
    )?.amount;
  const price = amount !== undefined ? { amount, currency: sub.currency } : undefined;
  const cadence = annualSub
    ? `a year, delivered every ${cycleWord(sub.interval)}${year ? ` · ${year.deliveriesMade} of ${year.deliveries} deliveries made` : ''}`
    : `every ${cycleWord(sub.interval)}`;
  const ended = sub.status === 'CANCELLED';
  // Booked to start later: nothing charged yet, so there is no cycle to skip
  // or pause (the API refuses both), but cancelling is free.
  const scheduled = !ended && hasNotStarted(sub);

  const handleCancel = async () => {
    // A paid year part-way through: cancelling ends it now, with the refund shown first.
    if (annualSub && !scheduled) {
      const quote = await fetchCancelQuote(sub.id).catch(() => null);
      if (quote) {
        if (!confirm(annualCancelMessage(quote))) return;
        cancel.mutate(sub.id);
        return;
      }
    }
    const base = scheduled
      ? 'Cancel this subscription? Nothing has been charged yet, so you will not pay anything.'
      : 'Cancel this subscription? Your current cycle has been paid for and will still be delivered.';
    // Terms: points earned on a subscription are removed when its cancellation takes effect.
    const earned = points?.bySubscription.find((p) => p.subscriptionId === sub.id)?.points ?? 0;
    const ends = sub.currentPeriodEnd ? ` on ${longDate(sub.currentPeriodEnd)}` : '';
    const message = earned
      ? `${base}

The ${formatPoints(earned)} points you earned on it will be removed when it ends${ends}. You can still use them before then.`
      : base;
    if (!confirm(message)) return;
    cancel.mutate(sub.id);
  };

  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium flex items-center gap-2 flex-wrap">
            {sub.plan.name}
            {scheduled && sub.startsAt ? (
              <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                Starts {longDate(sub.startsAt)}
              </span>
            ) : (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[sub.status]}`}
              >
                {STATUS_LABELS[sub.status]}
              </span>
            )}
            {sub.skipNextCycle && sub.status !== 'CANCELLED' && (
              <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                Next cycle skipped
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            For {sub.address.recipientName} — {sub.address.city}, {sub.address.state}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {price ? `${formatMoney(price.amount, price.currency)} ` : ''}
            {cadence}
            {sub.cancelAtPeriodEnd && !ended && ' · ends after this cycle'}
          </p>
        </div>

        {scheduled && sub.startsAt ? (
          <div className="text-right text-xs text-muted-foreground shrink-0">
            {sub.nextDeliveryDate && (
              <>
                <p>First delivery around</p>
                <p className="font-medium text-foreground mb-1.5">{longDate(sub.nextDeliveryDate)}</p>
              </>
            )}
            <p>{sub.cancelAtPeriodEnd ? 'Cancelled, never charged' : 'First charge'}</p>
            {!sub.cancelAtPeriodEnd && <p className="font-medium text-foreground">{longDate(sub.startsAt)}</p>}
          </div>
        ) : (
        <div className="text-right text-xs text-muted-foreground shrink-0">
          {sub.nextDeliveryDate && sub.status === 'ACTIVE' && !sub.skipNextCycle && (
            <>
              <p>Next delivery around</p>
              <p className="font-medium text-foreground mb-1.5">
                {formatDate(sub.nextDeliveryDate)}
              </p>
            </>
          )}
          <p>{sub.cancelAtPeriodEnd || ended ? 'Ends' : 'Renews'}</p>
          <p className="font-medium text-foreground">{formatDate(sub.currentPeriodEnd)}</p>
        </div>
        )}
      </div>

      {scheduled && !sub.cancelAtPeriodEnd && (
        <p className="mt-3 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-900">
          {isCurated(sub.plan)
            ? 'Nothing has been charged yet. You can cancel at no cost before the first charge.'
            : 'Nothing has been charged yet. You can change the box now, or cancel at no cost before the first charge.'}
          We&apos;ll email you a reminder a few days before.
        </p>
      )}

      <Deliveries deliveries={sub.orders ?? []} />

      {sub.items.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          <span className="font-medium text-foreground">Box:</span>{' '}
          {sub.items
            .map((i) => `${i.customItem.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
            .join(', ')}
        </p>
      )}
      {sub.items.length === 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {/* Possible only for subscriptions from before boxes had to be filled. */}
          <span className="font-medium text-foreground">Box:</span> no items chosen yet. Choose
          them before your next delivery so we know what to send.
        </p>
      )}
      {/* A curated box is set by us: there is nothing for the subscriber to edit. */}
      {!ended && !isCurated(sub.plan) && <BoxEditor sub={sub} />}

      <DietaryEditor sub={sub} readOnly={ended} />

      {!ended && (
        <div className="mt-3">
          <Label className="text-xs text-muted-foreground">If something isn&apos;t available</Label>
          <select
            className="mt-1 flex h-8 w-full max-w-xs rounded-md border border-input bg-background px-2 text-xs"
            value={sub.substitutionPreference}
            disabled={updatePreference.isPending}
            onChange={(e) =>
              updatePreference.mutate({
                id: sub.id,
                substitutionPreference: e.target.value as SubstitutionPreference,
              })
            }
          >
            <option value="SMART">Smart Substitute — replace with equal or better</option>
            <option value="ASK_FIRST">Ask me first (24h, then substitute)</option>
            <option value="NONE">Never substitute — leave it out</option>
          </select>
        </div>
      )}

      {sub.status === 'PAST_DUE' && (
        <p className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-900">
          We couldn&apos;t take payment for this cycle. We&apos;ll keep retrying — update your card
          above if it keeps failing. Deliveries continue in the meantime.
        </p>
      )}

      {!ended && (
        <div className="flex flex-wrap gap-2 mt-4">
          {!scheduled && sub.status !== 'PAUSED' &&
            (sub.skipNextCycle ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => unskip.mutate(sub.id)}>
                <SkipForward className="h-3.5 w-3.5 mr-1" /> Un-skip next
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => skip.mutate(sub.id)}>
                <SkipForward className="h-3.5 w-3.5 mr-1" /> {annualSub ? 'Move next delivery later' : 'Skip next delivery'}
              </Button>
            ))}

          {/* A paid year cannot be paused: the API refuses it. */}
          {scheduled || annualSub ? null : sub.status === 'PAUSED' ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => resume.mutate(sub.id)}>
              <PlayCircle className="h-3.5 w-3.5 mr-1" /> Resume
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => pause.mutate(sub.id)}>
              <PauseCircle className="h-3.5 w-3.5 mr-1" /> Pause
            </Button>
          )}

          {!sub.cancelAtPeriodEnd && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-red-600"
              disabled={busy}
              onClick={handleCancel}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

const DELIVERY_STATUS: Record<string, string> = {
  PENDING: 'Being arranged',
  PROCESSING: 'Being prepared',
  SHIPPED: 'On its way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

/** The most recent deliveries, newest first, with their photos. Older ones are in My Orders. */
function Deliveries({ deliveries }: { deliveries: SubscriptionDelivery[] }) {
  if (deliveries.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-foreground">Recent deliveries</p>
      <ul className="mt-1 divide-y rounded-md border text-xs">
        {deliveries.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <Link href={`/orders/${d.id}`} className="font-medium hover:underline">
                {formatDate(d.deliveryProofAt ?? d.preferredDeliveryDate ?? d.createdAt)}
              </Link>
              <span className="text-muted-foreground"> · {DELIVERY_STATUS[d.status] ?? d.status}</span>
            </div>
            {d.deliveryProofUrl && (
              <a
                href={d.deliveryProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline shrink-0"
              >
                <Camera className="h-3.5 w-3.5" /> Photo
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">
        Older deliveries are in <Link href="/orders" className="underline underline-offset-2">My Orders</Link>.
      </p>
    </div>
  );
}

/**
 * Cancelled subscriptions are history, not something to manage, so they sit
 * behind a toggle below the current ones. A subscription ending after this
 * cycle is still current: it has a delivery to come.
 */
function PastSubscriptions({ subs }: { subs: Subscription[] }) {
  const [open, setOpen] = useState(false);
  if (subs.length === 0) return null;
  return (
    <div className="mt-4 border-t pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {open ? 'Hide' : 'Show'} past subscriptions ({subs.length})
      </button>
      {open && (
        <ul className="mt-3 space-y-3">
          {subs.map((sub) => (
            <SubscriptionRow key={sub.id} sub={sub} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function MySubscriptionsCard() {
  const { data: subs, isLoading } = useMySubscriptions();
  const current = (subs ?? []).filter((s) => s.status !== 'CANCELLED');
  const past = (subs ?? []).filter((s) => s.status === 'CANCELLED');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Recurring gifts</CardTitle>
        </div>
        <CardDescription>
          Skip a delivery, pause, or cancel at any time. Changes apply from your next cycle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          <>
            {current.length === 0 ? (
              <div className="py-2">
                <p className="text-sm text-muted-foreground">
                  {past.length > 0
                    ? 'You have no active recurring gifts.'
                    : 'You don’t have any recurring gifts yet.'}
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/subscriptions">Browse subscription plans</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {current.map((sub) => (
                  <SubscriptionRow key={sub.id} sub={sub} />
                ))}
              </ul>
            )}
            <PastSubscriptions subs={past} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { Repeat, SkipForward, PauseCircle, PlayCircle, XCircle, ShieldAlert } from 'lucide-react';
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
  type Subscription,
  type SubscriptionStatus,
  type SubstitutionPreference,
} from '@/hooks/use-subscriptions';

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

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

function SubscriptionRow({ sub }: { sub: Subscription }) {
  const skip = useSkipCycle(true);
  const unskip = useSkipCycle(false);
  const pause = usePauseSubscription();
  const resume = useResumeSubscription();
  const cancel = useCancelSubscription();
  const updatePreference = useUpdateSubstitutionPreference();

  const busy =
    skip.isPending || unskip.isPending || pause.isPending || resume.isPending || cancel.isPending;
  const price = sub.plan.prices?.find((p) => p.interval === sub.interval);
  const cadence = sub.interval === 'MONTHLY' ? 'every month' : 'every 2 weeks';
  const ended = sub.status === 'CANCELLED';

  const handleCancel = () => {
    if (
      !confirm(
        'Cancel this subscription? Your current cycle has been paid for and will still be delivered.',
      )
    )
      return;
    cancel.mutate(sub.id);
  };

  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium flex items-center gap-2 flex-wrap">
            {sub.plan.name}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[sub.status]}`}
            >
              {STATUS_LABELS[sub.status]}
            </span>
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
            {price ? `${SYMBOLS[price.currency] ?? price.currency}${(price.amount / 100).toFixed(2)} ` : ''}
            {cadence}
            {sub.cancelAtPeriodEnd && !ended && ' · ends after this cycle'}
          </p>
        </div>

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
      </div>

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
          <span className="font-medium text-foreground">Box:</span> our pre-picked selection
        </p>
      )}

      {(sub.address.dietaryFlags?.length ?? 0) > 0 && (
        <p className="text-xs mt-2 flex items-start gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
          <span>
            <span className="font-medium">Dietary:</span>{' '}
            <span className="text-muted-foreground">
              {sub.address.dietaryFlags!.join(', ')}
              {sub.address.dietaryNotes ? ` — ${sub.address.dietaryNotes}` : ''}
            </span>
          </span>
        </p>
      )}

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
          {sub.status !== 'PAUSED' &&
            (sub.skipNextCycle ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => unskip.mutate(sub.id)}>
                <SkipForward className="h-3.5 w-3.5 mr-1" /> Un-skip next
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => skip.mutate(sub.id)}>
                <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip next delivery
              </Button>
            ))}

          {sub.status === 'PAUSED' ? (
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

export function MySubscriptionsCard() {
  const { data: subs, isLoading } = useMySubscriptions();

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
        ) : !subs || subs.length === 0 ? (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any recurring gifts yet.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/subscriptions">Browse subscription plans</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {subs.map((sub) => (
              <SubscriptionRow key={sub.id} sub={sub} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

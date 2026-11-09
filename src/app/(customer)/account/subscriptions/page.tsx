'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { MySubscriptionsCard } from '../my-subscriptions-card';
import { PointsCard } from '../points-card';
import { hasNotStarted, useMySubscriptions } from '@/hooks/use-subscriptions';
import { longDate } from '@/lib/subscription-start';

/**
 * A subscriber's recurring gifts, on a page of their own. They used to be the
 * fifth card down the account page, below the profile form, with no link in the
 * menu, and a new subscriber was sent to the top of that page with nothing to
 * say the subscription had worked.
 */
export default function MySubscriptionsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Account
      </Link>
      <h1 className="text-2xl font-bold">My subscriptions</h1>
      {/* useSearchParams needs a Suspense boundary in a client page. */}
      <Suspense fallback={null}>
        <SubscribedBanner />
      </Suspense>
      <MySubscriptionsCard />
      <PointsCard />
    </div>
  );
}

/** Shown once, straight after checkout (`?subscribed=true`). */
function SubscribedBanner() {
  const params = useSearchParams();
  const { data: subs } = useMySubscriptions();
  if (params.get('subscribed') !== 'true') return null;

  // The newest subscription is the one just created.
  const latest = subs?.[0];
  const later = latest && hasNotStarted(latest);
  const deliveryFrom = latest?.nextDeliveryDate;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">You&apos;re subscribed.</p>
        <p className="mt-0.5">
          {later && latest?.startsAt
            ? `Nothing has been charged yet. We'll charge your card on ${longDate(latest.startsAt)}${
                deliveryFrom ? `, and the first delivery is expected from around ${longDate(deliveryFrom)}` : ''
              }. We'll email you a reminder a few days before.`
            : 'Your first delivery is being prepared. You will get tracking updates and a delivery photo.'}
        </p>
      </div>
    </div>
  );
}

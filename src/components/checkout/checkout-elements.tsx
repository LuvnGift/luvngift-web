'use client';

import type { ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Spinner } from '@/components/ui/spinner';
import { useCustomerSession } from '@/hooks/use-checkout';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

/**
 * Stripe Elements for every web checkout (bundle, pay-later order, subscription).
 *
 * It passes a customer session, which is what lets the Payment Element list the
 * buyer's saved cards and show its own "save this card" box. Elements used to
 * get only the intent's secret, so a saved card was never offered: buyers typed
 * it again, saved it again, and their profile listed it twice (2026-11-13).
 *
 * Stripe reads `customerSessionClientSecret` only when Elements mounts, so we
 * wait for the session before mounting. If fetching it fails, checkout still
 * renders a plain card form: saved cards are a convenience, paying is not.
 */
export function CheckoutElements({
  clientSecret,
  children,
}: {
  clientSecret: string;
  children: ReactNode;
}) {
  const { data: customerSessionClientSecret, isPending } = useCustomerSession(clientSecret);

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        customerSessionClientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      {children}
    </Elements>
  );
}

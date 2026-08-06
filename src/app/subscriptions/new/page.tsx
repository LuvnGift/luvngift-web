import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Spinner } from '@/components/ui/spinner';
import { SubscribeFlow } from './subscribe-flow';

export const metadata: Metadata = {
  title: 'Start a Subscription — Luvngift',
  description: 'Set up recurring grocery deliveries to your loved ones in Nigeria.',
  // Personalised checkout flow — nothing here belongs in an index.
  robots: { index: false, follow: false },
};

export default function NewSubscriptionPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">
          Set up your subscription
        </h1>
        {/* useSearchParams needs a Suspense boundary during prerender. */}
        <Suspense fallback={<div className="flex justify-center py-16"><Spinner size="lg" /></div>}>
          <SubscribeFlow />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

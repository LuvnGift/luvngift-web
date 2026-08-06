import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Check, Repeat, Camera, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const metadata: Metadata = {
  title: 'Monthly Grocery Subscriptions to Nigeria — Luvngift',
  description:
    'Send groceries to your parents in Nigeria every month or every two weeks. You choose the box, we handle sourcing and delivery, and you get a delivery photo each time — no sending money to anyone.',
  alternates: { canonical: `${BASE_URL}/subscriptions` },
  openGraph: {
    title: 'Recurring Grocery Deliveries to Nigeria',
    description:
      'Subscribe once. Groceries reach your loved ones in Nigeria every month, handled end to end.',
    url: `${BASE_URL}/subscriptions`,
    type: 'website',
  },
};

interface Price {
  interval: 'MONTHLY' | 'BIWEEKLY';
  currency: string;
  amount: number;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  slotCount: number;
  image: string | null;
  prices: Price[];
}

async function fetchPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/subscriptions/plans`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

function formatPrice(price: Price) {
  return `${SYMBOLS[price.currency] ?? price.currency}${(price.amount / 100).toFixed(2)}`;
}

const HOW_IT_WORKS = [
  {
    icon: Check,
    title: 'Pick a plan and build the box',
    body: 'Each plan lets you choose a set number of items from our catalogue — or take our pre-picked box if you would rather not decide.',
  },
  {
    icon: Repeat,
    title: 'We deliver, again and again',
    body: 'Every month or every two weeks, our vetted partners in Nigeria source and deliver to your loved one. No transfers, no middlemen.',
  },
  {
    icon: Camera,
    title: 'See it arrive',
    body: 'Your delivery is photographed on arrival, so you know it landed — not just that money left your account.',
  },
  {
    icon: PauseCircle,
    title: 'Change it whenever',
    body: 'Skip a cycle, swap items, pause, or cancel from your account. No phone calls, no notice periods.',
  },
];

export default async function SubscriptionsPage() {
  const plans = await fetchPlans();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <header className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Groceries for the people you love — every month, handled
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Set it up once and we take care of the rest: sourcing, delivery, and proof it arrived.
            No sending money home and hoping someone follows through.
          </p>
        </header>

        {/* Plans */}
        <section className="mt-12" aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="text-xl font-semibold mb-6">
            Choose a plan
          </h2>

          {plans.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="font-medium">Plans are coming very soon.</p>
              <p className="text-muted-foreground text-sm mt-1">
                We&apos;re finalising our grocery partners in Nigeria.{' '}
                <Link href="/roadmap" className="underline underline-offset-2">
                  Join the waitlist
                </Link>{' '}
                and we&apos;ll let you know the moment it opens.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const monthly = plan.prices.find((p) => p.interval === 'MONTHLY');
                const biweekly = plan.prices.find((p) => p.interval === 'BIWEEKLY');
                return (
                  <div
                    key={plan.id}
                    className="flex flex-col rounded-xl border p-6 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 flex-1">
                      {plan.description}
                    </p>

                    <p className="mt-4 text-2xl font-bold">
                      {monthly ? formatPrice(monthly) : biweekly ? formatPrice(biweekly) : '—'}
                      <span className="text-sm font-normal text-muted-foreground">
                        {monthly ? ' / month' : biweekly ? ' / 2 weeks' : ''}
                      </span>
                    </p>
                    {monthly && biweekly && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        or {formatPrice(biweekly)} every two weeks
                      </p>
                    )}

                    <p className="mt-4 text-sm flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>
                        Choose any <strong>{plan.slotCount}</strong> item
                        {plan.slotCount === 1 ? '' : 's'} from our catalogue
                      </span>
                    </p>

                    <Button asChild className="mt-6 w-full">
                      <Link href={`/subscriptions/new?plan=${plan.slug}`}>Get started</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="mt-16" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-xl font-semibold mb-6">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.title} className="flex gap-4">
                <div className="rounded-lg bg-muted p-2.5 h-fit">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-12 text-xs text-muted-foreground max-w-3xl">
          Subscriptions renew automatically until you cancel. Prices are charged in your local
          currency. You can skip, pause or cancel at any time from your account — see our{' '}
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/refund-policy" className="underline underline-offset-2">
            Refund Policy
          </Link>
          .
        </p>
      </main>
      <Footer />
    </>
  );
}

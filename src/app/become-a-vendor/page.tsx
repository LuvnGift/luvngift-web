import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { VendorApplicationForm } from './vendor-application-form';
import { Store, Truck, PackageCheck, BadgeCheck, Wallet, CalendarClock, ShieldCheck, TrendingUp, Check } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Become a Vendor — Sell with Luvngift',
  description:
    'Sell with Luvngift and fulfil curated gift orders for the Nigerian diaspora. Apply to become a vendor — retail, delivery, or logistics. Keep up to 70% of net revenue, paid every two weeks.',
  alternates: { canonical: `${BASE_URL}/become-a-vendor` },
  openGraph: {
    title: 'Become a Luvngift Vendor',
    description:
      'Join our network of Nigeria-based vendors and fulfilment providers delivering gifts for customers abroad.',
    url: `${BASE_URL}/become-a-vendor`,
    type: 'website',
  },
};

const BENEFITS = [
  { icon: TrendingUp, title: 'A steady stream of orders', desc: 'We bring the customers — diaspora buyers ordering gifts for delivery across Nigeria.' },
  { icon: Wallet, title: 'Keep up to 70% of net revenue', desc: 'You earn the majority on every order you fulfil; Luvngift handles the storefront and payments.' },
  { icon: CalendarClock, title: 'Paid every two weeks', desc: 'Reliable payouts on a fortnightly schedule for completed, delivered orders.' },
  { icon: ShieldCheck, title: 'No upfront cost', desc: 'It is free to apply and join. You focus on fulfilment; we handle pricing and the customer experience.' },
];

const STEPS = [
  { icon: Store, title: 'Apply', desc: 'Tell us about your business and what you can fulfil across Nigeria.' },
  { icon: BadgeCheck, title: 'Get approved', desc: 'We review your application and send your onboarding details.' },
  { icon: PackageCheck, title: 'Receive orders', desc: 'We assign orders to you with full delivery details by email and SMS.' },
  { icon: Truck, title: 'Fulfil & earn', desc: 'Deliver the gift, keep us updated, and get paid on our payout schedule.' },
];

export default function BecomeAVendorPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/30 py-20 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
              <Store className="h-3.5 w-3.5 text-primary" />
              For Nigeria-based vendors &amp; fulfilment providers
            </div>
            <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl">
              Sell with <span className="text-primary">Luvngift</span>
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              We connect Nigerians abroad with loved ones at home through curated gifts. Join our network of
              vendors across Nigeria — supply products, handle delivery, or manage sourcing and fulfilment —
              and earn on every order you complete.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
              <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary" /> Up to 70% of net revenue</span>
              <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-primary" /> Paid every two weeks</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Free to join</span>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-2 text-2xl font-bold md:text-3xl">Why sell with Luvngift</h2>
              <p className="text-muted-foreground">We run the platform and bring the orders. You do what you do best — fulfil them.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => (
                <div key={b.title} className="rounded-xl border bg-card p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-1 font-semibold">{b.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-2xl font-bold md:text-3xl">How it works</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <div key={s.title} className="text-center">
                  <div className="relative mx-auto mb-4 inline-flex">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-1 font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Application form — wording + form side by side */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              {/* Left: wording */}
              <div className="lg:sticky lg:top-24">
                <h2 className="mb-3 text-2xl font-bold md:text-3xl">Apply to become a vendor</h2>
                <p className="mb-6 text-muted-foreground leading-relaxed">
                  Tell us about your business and we&apos;ll be in touch — usually within 2–3 business days.
                  Once approved, you&apos;ll start receiving orders right away.
                </p>
                <ul className="space-y-3">
                  {[
                    'Keep up to 70% of net revenue on every order you fulfil',
                    'Reliable payouts every two weeks',
                    'Order details delivered to you by email and SMS',
                    'Free to apply — no upfront cost',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-muted-foreground">
                  By applying you agree to our{' '}
                  <Link href="/vendor-agreement" className="font-medium text-foreground underline underline-offset-2">
                    Vendor Agreement
                  </Link>
                  . Questions? Email{' '}
                  <a href="mailto:info@luvngift.com" className="font-medium text-foreground underline underline-offset-2">
                    info@luvngift.com
                  </a>
                  .
                </p>
              </div>

              {/* Right: form */}
              <div>
                <VendorApplicationForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

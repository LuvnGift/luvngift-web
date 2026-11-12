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
    'Already make hampers or gift boxes in Nigeria? Fulfil Luvngift orders for Nigerians abroad in your state, using our branded packaging. Every order states, in naira, what you are paid.',
  alternates: { canonical: `${BASE_URL}/become-a-vendor` },
  openGraph: {
    title: 'Become a Luvngift Vendor',
    description:
      'Hamper and gift businesses across Nigeria: fulfil Luvngift orders for customers abroad, in our branded packaging.',
    url: `${BASE_URL}/become-a-vendor`,
    type: 'website',
  },
};

const BENEFITS = [
  { icon: TrendingUp, title: 'Orders you would not otherwise reach', desc: 'We bring the customers: Nigerians abroad ordering gifts for loved ones in your state.' },
  { icon: Wallet, title: 'Clear naira pay on every order', desc: 'Each order states, in naira, what you are paid: the goods plus your fee for packing and delivering it. It does not move with exchange rates, and card fees and customer reward points come out of our share, not yours.' },
  { icon: CalendarClock, title: 'Paid on a schedule agreed with you', desc: 'In full once the order is delivered, or part when you are assigned the order and the rest on delivery. Agreed when you are approved and shown on every order.' },
  { icon: PackageCheck, title: 'Our packaging, your craft', desc: 'We send you Luvngift boxes and wrapping at no cost to you. You source and pack the gift as you already do, in our packaging.' },
];

const STEPS = [
  { icon: Store, title: 'Apply', desc: 'Tell us about your hamper or gift business and the states you deliver to.' },
  { icon: BadgeCheck, title: 'Get vetted and approved', desc: 'We check your address, talk it through with you, and ask you to make a sample hamper in our packaging.' },
  { icon: PackageCheck, title: 'Receive orders', desc: 'We send you each order with full delivery details by email and SMS, and a link to update it.' },
  { icon: Truck, title: 'Deliver & get paid', desc: 'Pack it in our packaging, deliver it, upload the delivery photo, and get paid on your schedule. We rate every delivery.' },
];

export default function BecomeAVendorPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/30 py-20 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
              <Store className="h-3.5 w-3.5 text-primary" />
              For hamper &amp; gift businesses in Nigeria
            </div>
            <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl">
              Sell with <span className="text-primary">Luvngift</span>
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              We connect Nigerians abroad with loved ones at home through curated gifts. If you already make
              hampers or gift boxes, fulfil our orders in your state: you source, pack in our branded packaging
              and deliver, and earn on every order you complete.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
              <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary" /> Clear naira pay on every order</span>
              <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-primary" /> Paid on delivery or part upfront</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Free to join</span>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-2 text-2xl font-bold md:text-3xl">Why sell with Luvngift</h2>
              <p className="text-muted-foreground">We run the platform, bring the orders and supply the packaging. You do what you already do well.</p>
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
                <h2 className="mb-3 text-2xl font-bold md:text-3xl">Apply to become a partner</h2>
                <p className="mb-6 text-muted-foreground leading-relaxed">
                  Tell us about your business and we&apos;ll be in touch — usually within 2–3 business days.
                  Once you are approved, we send you our packaging and start sending you orders.
                </p>
                <ul className="space-y-3">
                  {[
                    'A stated naira amount on every order: goods plus your fee',
                    'Paid in full on delivery, or part upfront',
                    'Luvngift packaging supplied to you',
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

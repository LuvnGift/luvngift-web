import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { VendorApplicationForm } from './vendor-application-form';
import { Store, Truck, PackageCheck, BadgeCheck } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Become a Vendor — Partner with Luvngift in Nigeria',
  description:
    'Partner with Luvngift to fulfil curated gift orders for the Nigerian diaspora. Apply to become a vendor — retail, delivery, or logistics — and grow with us.',
  alternates: { canonical: `${BASE_URL}/become-a-vendor` },
  openGraph: {
    title: 'Become a Luvngift Vendor',
    description:
      'Join our network of Nigeria-based fulfilment partners delivering gifts for customers abroad.',
    url: `${BASE_URL}/become-a-vendor`,
    type: 'website',
  },
};

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
        <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/30 py-16 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              Partner with Luvngift
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              We connect Nigerians abroad with loved ones at home through curated gifts. Join our network of
              trusted vendors and fulfilment partners across Nigeria — supply products, handle delivery, or
              manage end-to-end logistics, and grow with every order.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <h2 className="mb-10 text-center text-2xl font-bold">How partnering works</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Application form */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold">Apply to become a vendor</h2>
              <p className="mt-2 text-muted-foreground">
                Fill in your details below. There&apos;s no cost to apply.
              </p>
            </div>
            <VendorApplicationForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

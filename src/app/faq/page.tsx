import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { FaqSection } from '@/components/seo/faq-section';
import { GENERAL_FAQS } from '@/content/faqs';
import { Gift } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — Sending Gifts to Nigeria',
  description:
    'Everything you need to know about sending gifts to Nigeria with Luvngift — delivery times, areas covered, currencies, payment security, tracking, and custom gifts.',
  alternates: { canonical: `${BASE_URL}/faq` },
  openGraph: {
    title: 'FAQ | Luvngift',
    description:
      'Answers to common questions about sending curated gift bundles to loved ones in Nigeria from the diaspora.',
    url: `${BASE_URL}/faq`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ | Luvngift',
    description: 'How sending gifts to Nigeria with Luvngift works — delivery, payment, tracking, and more.',
  },
};

export default function FaqPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/30 py-20">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Frequently asked questions
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Everything you need to know about sending curated gifts to your loved ones in Nigeria —
              from delivery times and coverage to payment, currencies, and tracking.
            </p>
          </div>
        </section>

        {/* FAQ list */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <FaqSection faqs={GENERAL_FAQS} title="Common questions" />
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="text-2xl font-bold mb-3">Still have a question?</h2>
            <p className="text-muted-foreground mb-6">
              Our team is happy to help — or start sending a gift in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/occasions">
                  <Gift className="h-4 w-4 mr-2" />
                  Browse occasions
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

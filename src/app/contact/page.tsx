import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ContactClient } from './contact-client';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the Luvngift team. We\'re here to help with orders, questions, and feedback — and we reply within 24-48 hours.',
  alternates: { canonical: `${BASE_URL}/contact` },
  openGraph: {
    title: 'Contact Us | Luvngift',
    description: 'Reach the Luvngift support team. Questions about orders, delivery, or anything else — we\'re here.',
    url: `${BASE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <ContactClient />
      </main>
      <Footer />
    </div>
  );
}

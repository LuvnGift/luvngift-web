import type { Metadata } from 'next';
import { OccasionsClientPage } from './occasions-client';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';

export const metadata: Metadata = {
  title: 'Shop by Occasion',
  description:
    'Browse curated gift bundles for birthdays, Christmas, Eid, Valentine\'s Day, and more — delivered anywhere in Nigeria. Pay in CAD, USD, or GBP.',
  alternates: { canonical: `${BASE_URL}/occasions` },
  openGraph: {
    title: 'Shop by Occasion | Luvngift',
    description:
      'Find the perfect gift for every Nigerian occasion. Curated bundles for birthdays, Christmas, Eid, and more — delivered right to their door.',
    url: `${BASE_URL}/occasions`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop by Occasion | Luvngift',
    description: 'Curated gift bundles for every Nigerian occasion — delivered from the diaspora.',
  },
};

export default function OccasionsPage() {
  return <OccasionsClientPage />;
}

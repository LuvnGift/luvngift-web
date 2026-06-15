import type { Metadata } from 'next';
import Link from 'next/link';
import { Wand2 } from 'lucide-react';
import { OccasionCard } from '@/components/occasions/occasion-card';
import type { Occasion } from '@luvngift/shared';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const metadata: Metadata = {
  title: 'Shop by Occasion',
  description:
    "Browse curated gift bundles for birthdays, Christmas, Eid, Valentine's Day, and more — delivered anywhere in Nigeria. Pay in CAD, USD, or GBP.",
  alternates: { canonical: `${BASE_URL}/occasions` },
  openGraph: {
    title: 'Shop by Occasion | Luvngift',
    description:
      "Find the perfect gift for every Nigerian occasion. Curated bundles for birthdays, Christmas, Eid, and more — delivered right to their door.",
    url: `${BASE_URL}/occasions`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop by Occasion | Luvngift',
    description: 'Curated gift bundles for every Nigerian occasion — delivered from the diaspora.',
  },
};

async function fetchOccasions(): Promise<Occasion[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/occasions`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

const itemListJsonLd = (occasions: Occasion[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Gift occasions',
  itemListElement: occasions.map((o, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: o.name,
    url: `${BASE_URL}/occasions/${o.slug}`,
  })),
});

export default async function OccasionsPage() {
  const occasions = await fetchOccasions();
  const active = occasions.filter((o) => o.isActive);

  return (
    <div className="container mx-auto px-4 py-12">
      {active.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(active)) }}
        />
      )}

      {/* Hero */}
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Send a gift to Nigeria</h1>
        <p className="text-muted-foreground text-lg mb-6">
          Choose an occasion below to explore curated bundles, or build a custom gift from scratch.
        </p>
        <Link
          href="/custom"
          prefetch={false}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Wand2 className="h-4 w-4" />
          Build a custom gift
        </Link>
      </div>

      {/* Occasions grid — server-rendered so Google indexes every card */}
      {active.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>No occasions available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {active.map((occasion) => (
            <OccasionCard key={occasion.id} occasion={occasion} />
          ))}
        </div>
      )}
    </div>
  );
}

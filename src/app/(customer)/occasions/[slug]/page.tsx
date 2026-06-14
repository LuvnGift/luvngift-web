import type { Metadata } from 'next';
import { OccasionDetailClient } from './occasion-detail-client';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Occasion {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

async function fetchOccasion(slug: string): Promise<Occasion | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/occasions/slug/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/api/v1/occasions?limit=100`);
    if (!res.ok) return [];
    const json = await res.json();
    const occasions: { slug: string }[] = json.data ?? [];
    return occasions.map((o) => ({ slug: o.slug }));
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const occasion = await fetchOccasion(slug);

  if (!occasion) {
    return { title: 'Occasion Not Found' };
  }

  const title = `${occasion.name} Gift Bundles — Send to Nigeria`;
  const description =
    occasion.description ??
    `Shop curated ${occasion.name} gift bundles delivered to Nigeria. Pay in CAD, USD, or GBP — we handle everything.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/occasions/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/occasions/${slug}`,
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function OccasionDetailPage({ params }: Props) {
  const { slug } = await params;
  return <OccasionDetailClient slug={slug} />;
}

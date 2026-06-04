import type { Metadata } from 'next';
import { BundleDetailClient } from './bundle-detail-client';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Bundle {
  id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  estimatedDeliveryDays?: number;
}

async function fetchBundle(id: string): Promise<Bundle | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/bundles/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const bundle = await fetchBundle(id);

  if (!bundle) {
    return { title: 'Bundle Not Found' };
  }

  const title = `${bundle.name} — Gift Bundle to Nigeria`;
  const description =
    bundle.description ??
    `Send the ${bundle.name} gift bundle to Nigeria. Curated and delivered by Luvngift.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/bundles/${id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/bundles/${id}`,
      type: 'website',
      images: bundle.images?.[0]
        ? [{ url: bundle.images[0], width: 1200, height: 630, alt: bundle.name }]
        : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BundleDetailPage({ params }: Props) {
  const { id } = await params;
  const bundle = await fetchBundle(id);

  const productJsonLd = bundle
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: bundle.name,
        description: bundle.description,
        image: bundle.images?.[0],
        url: `${BASE_URL}/bundles/${id}`,
        brand: { '@type': 'Brand', name: 'Luvngift' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'NGN',
          price: (bundle.price / 100).toFixed(2),
          availability: 'https://schema.org/InStock',
          url: `${BASE_URL}/bundles/${id}`,
        },
      }
    : null;

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <BundleDetailClient id={id} />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Check } from 'lucide-react';
import { PurchasePanel } from './purchase-panel';
import type { Bundle } from '@luvngift/shared';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// Next.js dedupes identical fetch() calls within a single render, so calling this
// from generateMetadata and the page component results in one network request.
async function fetchBundle(slug: string): Promise<Bundle | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/bundles/${slug}`, {
      next: { revalidate: 300 },
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
    const res = await fetch(`${API_URL}/api/v1/bundles?limit=200&isActive=true`);
    if (!res.ok) return [];
    const json = await res.json();
    const bundles: { slug: string }[] = json.data?.bundles ?? json.data ?? [];
    return bundles.map((b) => ({ slug: b.slug }));
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await fetchBundle(slug);

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
    alternates: { canonical: `${BASE_URL}/bundles/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/bundles/${slug}`,
      type: 'website',
      images: bundle.images?.[0]
        ? [{ url: bundle.images[0], width: 1200, height: 630, alt: bundle.name }]
        : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BundleDetailPage({ params }: Props) {
  const { slug } = await params;
  const bundle = await fetchBundle(slug);

  // Render a real 404 (not a soft-404) when the bundle doesn't exist.
  if (!bundle) {
    notFound();
  }

  // priceValidUntil — Google recommends an explicit date on Offers; default to ~1 year out.
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: bundle.name,
    description: bundle.description,
    image: bundle.images?.[0],
    url: `${BASE_URL}/bundles/${slug}`,
    brand: { '@type': 'Brand', name: 'Luvngift' },
    offers: {
      '@type': 'Offer',
      // Bundle prices are stored in the bundle's own currency (CAD/USD/GBP),
      // not NGN — the recipient is in Nigeria but the buyer pays in their currency.
      priceCurrency: bundle.currency ?? 'USD',
      price: (bundle.price / 100).toFixed(2),
      priceValidUntil,
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/bundles/${slug}`,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Occasions', item: `${BASE_URL}/occasions` },
      { '@type': 'ListItem', position: 3, name: bundle.name, item: `${BASE_URL}/bundles/${slug}` },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Link
        href="/occasions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images — server-rendered for indexable alt text and LCP */}
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            {bundle.images?.[0] ? (
              <Image src={bundle.images[0]} alt={bundle.name} fill priority className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl">🎁</div>
            )}
          </div>
          {bundle.images?.slice(1, 3).length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {bundle.images.slice(1, 3).map((img, i) => (
                <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <Image src={img} alt={`${bundle.name} ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details — server-rendered so Google indexes the full product copy */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold mb-2">{bundle.name}</h1>
            <p className="text-muted-foreground">{bundle.description}</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Estimated delivery: {bundle.estimatedDeliveryDays} business days</span>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">What's included</h2>
            <ul className="space-y-1">
              {bundle.items?.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}</span>
                  {item.description && (
                    <span className="text-muted-foreground">— {item.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Price + checkout is interactive (currency conversion, Stripe) — client island */}
          <PurchasePanel bundle={bundle} />
        </div>
      </div>
    </div>
  );
}

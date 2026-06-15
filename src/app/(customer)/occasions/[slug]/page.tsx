import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Wand2, Check } from 'lucide-react';
import { BundleCard } from '@/components/bundles/bundle-card';
import { Button } from '@/components/ui/button';
import { FaqSection } from '@/components/seo/faq-section';
import type { FAQ } from '@/content/faqs';
import type { Bundle } from '@luvngift/shared';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.luvngift.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Occasion {
  id: string;
  name: string;
  slug: string;
  description?: string;
  bundles?: Bundle[];
  // SEO content from the DB (admin-editable).
  seoIntro?: string | null;
  highlights?: string[];
  faqs?: FAQ[] | null;
}

// Next.js dedupes identical fetch() calls within a single render, so calling this
// from both generateMetadata and the page component results in one network request.
async function fetchOccasion(slug: string): Promise<Occasion | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/occasions/${slug}`, {
      next: { revalidate: 60 },
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
  const occasion = await fetchOccasion(slug);

  // Render a real 404 (not a soft-404) when the occasion doesn't exist.
  if (!occasion) {
    notFound();
  }

  const bundles = (occasion.bundles ?? []).filter((b) => b.isActive);

  // SEO content comes from the DB (admin-editable). seoIntro is a free-text blob;
  // split it into paragraphs on blank/new lines for rendering.
  const introParagraphs = (occasion.seoIntro ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const highlights = occasion.highlights ?? [];
  const faqs = occasion.faqs ?? [];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Occasions', item: `${BASE_URL}/occasions` },
      { '@type': 'ListItem', position: 3, name: occasion.name, item: `${BASE_URL}/occasions/${slug}` },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Link
        href="/occasions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All occasions
      </Link>

      <div className="mb-12">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{occasion.name}</h1>
          <p className="text-lg text-muted-foreground">{occasion.description}</p>
        </div>

        {(introParagraphs.length > 0 || highlights.length > 0) && (
          <div className="mt-6 grid gap-8 lg:grid-cols-3 lg:items-start">
            {introParagraphs.length > 0 && (
              <div
                className={`space-y-4 text-[15px] leading-7 text-foreground/80 ${
                  highlights.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3 max-w-3xl'
                }`}
              >
                {introParagraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            {highlights.length > 0 && (
              <div className="rounded-xl border bg-muted/40 p-5 sm:p-6">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Why you'll love these gifts
                </h2>
                <ul className="space-y-3">
                  {highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      <span className="text-sm leading-snug">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {bundles.length > 0 ? (
        <>
          <h2 className="text-xl font-semibold mb-6">Available bundles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-muted-foreground mb-4">No bundles available for this occasion yet.</p>
          <Button asChild>
            <Link href="/custom" prefetch={false}>
              <Wand2 className="h-4 w-4 mr-2" />
              Build a custom gift instead
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-12 p-6 bg-muted rounded-lg text-center">
        <h3 className="font-semibold mb-2">Can't find what you're looking for?</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Describe exactly what you need and our team will curate it for you.
        </p>
        <Button variant="outline" asChild>
          <Link href="/custom" prefetch={false}>
            <Wand2 className="h-4 w-4 mr-2" />
            Request a custom gift
          </Link>
        </Button>
      </div>

      {faqs.length > 0 && (
        <FaqSection
          faqs={faqs}
          title={`${occasion.name} gifts — frequently asked questions`}
          className="mt-16"
        />
      )}
    </div>
  );
}

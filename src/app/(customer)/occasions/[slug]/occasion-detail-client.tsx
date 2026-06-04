'use client';

import Link from 'next/link';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { useOccasionBySlug, useBundlesByOccasion } from '@/hooks/use-occasions';
import { BundleCard } from '@/components/bundles/bundle-card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface Props {
  slug: string;
}

export function OccasionDetailClient({ slug }: Props) {
  const { data: occasion, isLoading: occasionLoading, isError } = useOccasionBySlug(slug);
  const { data: bundles, isLoading: bundlesLoading } = useBundlesByOccasion(occasion?.id ?? '');

  const isLoading = occasionLoading || bundlesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !occasion) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Occasion not found.</p>
        <Button variant="outline" asChild>
          <Link href="/occasions"><ArrowLeft className="h-4 w-4 mr-2" />Back to occasions</Link>
        </Button>
      </div>
    );
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.luvngift.com' },
      { '@type': 'ListItem', position: 2, name: 'Occasions', item: 'https://www.luvngift.com/occasions' },
      { '@type': 'ListItem', position: 3, name: occasion.name, item: `https://www.luvngift.com/occasions/${slug}` },
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

      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">{occasion.name}</h1>
        <p className="text-muted-foreground text-lg">{occasion.description}</p>
      </div>

      {bundles && bundles.length > 0 ? (
        <>
          <h2 className="text-xl font-semibold mb-6">Available bundles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.filter((b) => b.isActive).map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-muted-foreground mb-4">No bundles available for this occasion yet.</p>
          <Button asChild>
            <Link href="/custom">
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
          <Link href="/custom">
            <Wand2 className="h-4 w-4 mr-2" />
            Request a custom gift
          </Link>
        </Button>
      </div>
    </div>
  );
}

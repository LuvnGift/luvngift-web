'use client';

import Link from 'next/link';
import { useFeaturedReviews } from '@/hooks/use-reviews';
import { ReviewCard } from './review-card';

/**
 * The home page strip: reviews an admin chose to feature. Fetched in the
 * browser so the prerendered home page gains no build-time request and no
 * dependency on this endpoint. Renders nothing while loading, on an error or
 * when none are featured: never placeholder testimonials.
 */
export function FeaturedReviews() {
  const { data } = useFeaturedReviews(6);
  if (!data || data.length === 0) return null;

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">What customers say</h2>
            <p className="text-muted-foreground mt-1">From buyers whose gifts we delivered.</p>
          </div>
          <Link href="/reviews" className="text-sm font-medium text-primary hover:underline">
            Read all reviews
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((review) => <ReviewCard key={review.id} review={review} />)}
        </div>
      </div>
    </section>
  );
}

'use client';

import type { ReviewRatingSummary } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useBundleReviews } from '@/hooks/use-reviews';
import { RatingSummary } from './rating-summary';
import { ReviewCard } from './review-card';

interface BundleReviewsProps {
  bundleId: string;
  /** Embedded in the bundle payload; null until a review is approved. */
  rating: ReviewRatingSummary | null | undefined;
}

/**
 * The review list on a bundle page. Fetched in the browser, not at render:
 * the page is prerendered, and a server fetch here would be one more request
 * per bundle on every Vercel build. The summary is already in the payload.
 */
export function BundleReviews({ bundleId, rating }: BundleReviewsProps) {
  const hasReviews = Boolean(rating && rating.count > 0);
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useBundleReviews(
    hasReviews ? bundleId : '',
  );
  if (!hasReviews) return null;

  const reviews = data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <section id="reviews" className="mt-12 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold">Customer reviews</h2>
        <RatingSummary rating={rating} />
      </div>
      {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
      {isError && <p className="text-sm text-muted-foreground">Reviews could not be loaded right now.</p>}
      <div className="space-y-3">
        {reviews.map((review) => <ReviewCard key={review.id} review={review} showGift={false} />)}
      </div>
      {hasNextPage && (
        <Button variant="outline" className="mt-4" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading…' : 'Show more reviews'}
        </Button>
      )}
    </section>
  );
}

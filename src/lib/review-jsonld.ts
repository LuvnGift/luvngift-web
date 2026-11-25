import { REVIEW_RATING_MAX, REVIEW_RATING_MIN, type ReviewRatingSummary } from '@luvngift/shared';

/**
 * `aggregateRating` for a bundle's Product JSON-LD, or nothing at all.
 *
 * Only real, approved reviews count, and the same figures are visible on the
 * page (Google requires marked-up ratings to be shown to the visitor). With no
 * approved review there is no rating to claim, so the property is omitted
 * rather than sent as zero.
 */
export function aggregateRatingFor(rating: ReviewRatingSummary | null | undefined) {
  if (!rating || rating.count < 1) return undefined;
  return {
    '@type': 'AggregateRating',
    ratingValue: rating.average.toFixed(1),
    reviewCount: rating.count,
    bestRating: REVIEW_RATING_MAX,
    worstRating: REVIEW_RATING_MIN,
  };
}

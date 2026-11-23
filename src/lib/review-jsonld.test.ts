import { describe, expect, it } from 'vitest';
import { aggregateRatingFor } from './review-jsonld';

describe('aggregateRatingFor', () => {
  it('omits the rating when no review is approved', () => {
    expect(aggregateRatingFor(null)).toBeUndefined();
    expect(aggregateRatingFor(undefined)).toBeUndefined();
    expect(aggregateRatingFor({ average: 0, count: 0 })).toBeUndefined();
  });

  it('marks up the same figures the page shows', () => {
    expect(aggregateRatingFor({ average: 4.6, count: 12 })).toEqual({
      '@type': 'AggregateRating',
      ratingValue: '4.6',
      reviewCount: 12,
      bestRating: 5,
      worstRating: 1,
    });
  });
});

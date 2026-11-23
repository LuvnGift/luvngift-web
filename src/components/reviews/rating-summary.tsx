import type { ReviewRatingSummary } from '@luvngift/shared';
import { cn } from '@/lib/utils';
import { Stars } from './stars';

interface RatingSummaryProps {
  rating: ReviewRatingSummary | null | undefined;
  className?: string;
  /** Where the count links to, e.g. "#reviews" on a bundle page. */
  href?: string;
}

/**
 * "★★★★½ 4.6 (12 reviews)". Renders nothing until a review is approved:
 * never placeholder stars or an invented count.
 */
export function RatingSummary({ rating, className, href }: RatingSummaryProps) {
  if (!rating || rating.count < 1) return null;
  const count = `${rating.count} review${rating.count === 1 ? '' : 's'}`;
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Stars value={rating.average} />
      <span className="font-medium">{rating.average.toFixed(1)}</span>
      {href ? (
        <a href={href} className="text-muted-foreground underline-offset-2 hover:underline">
          ({count})
        </a>
      ) : (
        <span className="text-muted-foreground">({count})</span>
      )}
    </div>
  );
}

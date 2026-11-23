import Link from 'next/link';
import type { PublicReview, ReviewOrderKind } from '@luvngift/shared';
import { Stars } from './stars';

const KIND_LABEL: Record<ReviewOrderKind, string> = {
  BUNDLE: 'Gift bundle',
  SUBSCRIPTION: 'Subscription',
  CUSTOM: 'Custom gift',
};

const reviewDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

interface ReviewCardProps {
  review: PublicReview;
  /** On a bundle page the bundle is already known, so it is not repeated. */
  showGift?: boolean;
}

/** One approved review. Every review shown is from a buyer of a delivered order. */
export function ReviewCard({ review, showGift = true }: ReviewCardProps) {
  return (
    <article className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stars value={review.rating} />
        <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
          {reviewDate(review.createdAt)}
        </time>
      </div>
      {review.comment && (
        <p className="text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>
      )}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{review.reviewerName}</span>
        {' · Verified buyer'}
        {showGift && (
          <>
            {' · '}
            {review.bundle ? (
              <Link href={`/bundles/${review.bundle.slug}`} className="underline-offset-2 hover:underline">
                {review.bundle.name}
              </Link>
            ) : (
              KIND_LABEL[review.kind]
            )}
          </>
        )}
      </p>
      {review.reply && (
        <div className="rounded-md bg-muted/60 p-3 text-sm">
          <p className="text-xs font-semibold mb-1">Reply from Luvngift</p>
          <p className="whitespace-pre-line text-muted-foreground">{review.reply}</p>
        </div>
      )}
    </article>
  );
}

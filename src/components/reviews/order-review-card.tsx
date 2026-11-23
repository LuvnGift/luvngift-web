'use client';

import { useEffect, useRef, useState } from 'react';
import {
  REVIEW_COMMENT_MAX,
  createReviewSchema,
  publicReviewerName,
  type OwnReview,
} from '@luvngift/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { useCreateReview, useDeleteReview } from '@/hooks/use-reviews';
import { Stars } from './stars';
import { StarInput } from './star-input';

interface OrderReviewCardProps {
  orderId: string;
  review: OwnReview | null;
  /** `?review=1` from the request email: bring the form into view. */
  focus?: boolean;
}

/**
 * On a delivered order: the form, or the buyer's own review and whether it is
 * published. Shown only for DELIVERED orders (the API refuses any other).
 */
export function OrderReviewCard({ orderId, review, focus }: OrderReviewCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus]);

  return (
    <div ref={ref} id="review">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{review ? 'Your review' : 'How was this gift?'}</CardTitle>
        </CardHeader>
        <CardContent>
          {review ? <OwnReviewView orderId={orderId} review={review} /> : <ReviewForm orderId={orderId} />}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewForm({ orderId }: { orderId: string }) {
  const user = useAuthStore((s) => s.user);
  const create = useCreateReview(orderId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createReviewSchema.safeParse({ orderId, rating, comment });
    if (!parsed.success) {
      setError(rating ? 'Please check your comment.' : 'Choose a star rating first.');
      return;
    }
    setError(null);
    create.mutate({ rating: parsed.data.rating, comment: parsed.data.comment });
  };

  const shownAs = publicReviewerName({
    firstName: user?.firstName,
    lastName: user?.lastName,
    city: (user as { billingCity?: string } | null)?.billingCity,
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <StarInput value={rating} onChange={setRating} disabled={create.isPending} />
      <div className="space-y-1.5">
        <Label htmlFor="review-comment">Tell other families about it (optional)</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={REVIEW_COMMENT_MAX}
          rows={4}
          disabled={create.isPending}
          placeholder="Did it arrive as expected? How did they like it?"
        />
        <p className="text-xs text-muted-foreground text-right">
          {comment.length}/{REVIEW_COMMENT_MAX}
        </p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Your review will appear as <span className="font-medium text-foreground">{shownAs}</span>.
        We check every review before it goes live and publish good and bad ones alike. Please
        leave out phone numbers and addresses.
      </p>
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Sending…' : 'Submit review'}
      </Button>
    </form>
  );
}

const STATUS_COPY = {
  PENDING: 'Thank you. We are checking it and it will appear on our website soon.',
  APPROVED: 'Published on our website. Thank you for helping other families.',
  REJECTED: 'This review is not published on our website. You can delete it and write a new one.',
} as const;

function OwnReviewView({ orderId, review }: { orderId: string; review: OwnReview }) {
  const remove = useDeleteReview(orderId);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="space-y-3 text-sm">
      <Stars value={review.rating} size="md" />
      {review.comment && <p className="whitespace-pre-line">{review.comment}</p>}
      <p className="text-muted-foreground">{STATUS_COPY[review.status]}</p>
      {review.reply && (
        <div className="rounded-md bg-muted/60 p-3">
          <p className="text-xs font-semibold mb-1">Reply from Luvngift</p>
          <p className="whitespace-pre-line text-muted-foreground">{review.reply}</p>
        </div>
      )}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span>Delete your review?</span>
          <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(review.id)}>
            Delete
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>Keep it</Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="px-0 text-muted-foreground" onClick={() => setConfirming(true)}>
          Delete my review
        </Button>
      )}
    </div>
  );
}

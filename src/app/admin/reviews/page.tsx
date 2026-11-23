'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import type { ReviewStatus } from '@luvngift/shared';
import { useAdminReviews } from '@/hooks/use-admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { ReviewModerationCard } from './review-moderation-card';

const TABS: { status: ReviewStatus; label: string; empty: string }[] = [
  { status: 'PENDING', label: 'Waiting', empty: 'No reviews are waiting for moderation.' },
  { status: 'APPROVED', label: 'Published', empty: 'No reviews have been published yet.' },
  { status: 'REJECTED', label: 'Not published', empty: 'No reviews have been rejected.' },
];

/**
 * Review moderation. Publish anything that is not abusive, unlawful, private
 * information, off-topic or spam: a low rating is not a reason to hold a
 * review back (Terms § 14), and the reject form offers no such option.
 */
export default function AdminReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus>('PENDING');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminReviews(status, page);
  const tab = TABS.find((t) => t.status === status)!;
  const totalPages = data?.meta.totalPages ?? 1;

  const choose = (next: ReviewStatus) => {
    setStatus(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground text-sm">
          Publish every honest review, good or bad. Reject only abuse, unlawful content, private
          information, reviews not about the order, and spam.
        </p>
      </div>

      <div role="tablist" aria-label="Review status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.status}
            role="tab"
            aria-selected={status === t.status}
            variant={status === t.status ? 'default' : 'outline'}
            size="sm"
            onClick={() => choose(t.status)}
          >
            {t.label}
            {status === t.status && data ? ` (${data.meta.total})` : ''}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Spinner /></div>
      ) : isError ? (
        <p className="text-sm text-destructive">Reviews could not be loaded.</p>
      ) : !data || data.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Star className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{tab.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.data.map((review) => <ReviewModerationCard key={review.id} review={review} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className={cn('flex items-center justify-center gap-3 text-sm')}>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Home, MessageSquareReply, XCircle } from 'lucide-react';
import {
  REVIEW_REJECTION_LABELS,
  REVIEW_REJECTION_NOTE_MAX,
  REVIEW_REJECTION_REASONS,
  REVIEW_REPLY_MAX,
  shortId,
  type AdminReview,
  type ReviewRejectionReason,
} from '@luvngift/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stars } from '@/components/reviews/stars';
import { useSetReviewFeatured, useSetReviewReply, useSetReviewStatus } from '@/hooks/use-admin';

const KIND_LABEL = { BUNDLE: 'Bundle', SUBSCRIPTION: 'Subscription', CUSTOM: 'Custom gift' } as const;

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function ReviewModerationCard({ review }: { review: AdminReview }) {
  const [panel, setPanel] = useState<'none' | 'reject' | 'reply'>('none');
  const setStatus = useSetReviewStatus();
  const featured = useSetReviewFeatured();
  const busy = setStatus.isPending || featured.isPending;
  const customer = [review.customer.firstName, review.customer.lastName].filter(Boolean).join(' ');

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Stars value={review.rating} size="md" />
          <div className="flex items-center gap-2">
            {review.isFeatured && <Badge variant="secondary">On home page</Badge>}
            <span className="text-xs text-muted-foreground">{day(review.createdAt)}</span>
          </div>
        </div>

        {review.comment ? (
          <p className="text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Rating only, no comment.</p>
        )}

        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>
            Shown as <span className="font-medium text-foreground">{review.reviewerName}</span>
            {customer && ` · ${customer}`} · {review.customer.email}
          </p>
          <p>
            <Link href={`/admin/orders?order=${review.orderId}`} className="underline-offset-2 hover:underline">
              Order {shortId(review.orderId)}
            </Link>
            {' · '}
            {review.bundle?.name ?? KIND_LABEL[review.kind]}
          </p>
        </div>

        {review.status === 'REJECTED' && review.rejectionReason && (
          <p className="text-xs rounded-md bg-muted/60 p-2">
            Not published: {REVIEW_REJECTION_LABELS[review.rejectionReason]}
            {review.rejectionNote ? `. ${review.rejectionNote}` : ''}
          </p>
        )}

        {review.reply && panel !== 'reply' && (
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <p className="text-xs font-semibold mb-1">Our public reply</p>
            <p className="whitespace-pre-line text-muted-foreground">{review.reply}</p>
          </div>
        )}

        {panel === 'reject' && <RejectForm review={review} onDone={() => setPanel('none')} />}
        {panel === 'reply' && <ReplyForm review={review} onDone={() => setPanel('none')} />}

        {panel === 'none' && (
          <div className="flex flex-wrap gap-2 pt-1">
            {review.status !== 'APPROVED' && (
              <Button size="sm" disabled={busy} onClick={() => setStatus.mutate({ id: review.id, status: 'APPROVED' })}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Publish
              </Button>
            )}
            {review.status !== 'REJECTED' && (
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => setPanel('reject')}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> {review.status === 'APPROVED' ? 'Unpublish' : 'Reject'}
              </Button>
            )}
            {review.status !== 'REJECTED' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setPanel('reply')}>
                <MessageSquareReply className="h-3.5 w-3.5 mr-1" /> {review.reply ? 'Edit reply' : 'Reply'}
              </Button>
            )}
            {review.status === 'APPROVED' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => featured.mutate({ id: review.id, featured: !review.isFeatured })}>
                <Home className="h-3.5 w-3.5 mr-1" /> {review.isFeatured ? 'Remove from home page' : 'Feature on home page'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RejectForm({ review, onDone }: { review: AdminReview; onDone: () => void }) {
  const setStatus = useSetReviewStatus();
  const [reason, setReason] = useState<ReviewRejectionReason | ''>('');
  const [note, setNote] = useState('');

  const submit = () => {
    if (!reason) return;
    setStatus.mutate(
      { id: review.id, status: 'REJECTED', reason, note: note.trim() || undefined },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-xs text-muted-foreground">
        For our records only: the customer is not told the reason. A low rating or criticism is
        not a reason.
      </p>
      <div className="space-y-1.5">
        <Label>Reason</Label>
        <Select value={reason} onValueChange={(v) => setReason(v as ReviewRejectionReason)}>
          <SelectTrigger aria-label="Reason"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
          <SelectContent>
            {REVIEW_REJECTION_REASONS.map((r) => (
              <SelectItem key={r} value={r}>{REVIEW_REJECTION_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`note-${review.id}`}>Internal note (optional)</Label>
        <Input id={`note-${review.id}`} value={note} maxLength={REVIEW_REJECTION_NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="e.g. It included a phone number" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" disabled={!reason || setStatus.isPending} onClick={submit}>
          {review.status === 'APPROVED' ? 'Unpublish' : 'Reject'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function ReplyForm({ review, onDone }: { review: AdminReview; onDone: () => void }) {
  const setReply = useSetReviewReply();
  const [text, setText] = useState(review.reply ?? '');
  const save = (reply: string | null) => setReply.mutate({ id: review.id, reply }, { onSuccess: onDone });

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Label htmlFor={`reply-${review.id}`}>Public reply (shown under the review)</Label>
      <Textarea id={`reply-${review.id}`} rows={3} value={text} maxLength={REVIEW_REPLY_MAX} onChange={(e) => setText(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!text.trim() || setReply.isPending} onClick={() => save(text)}>Save reply</Button>
        {review.reply && (
          <Button size="sm" variant="outline" disabled={setReply.isPending} onClick={() => save(null)}>Remove reply</Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

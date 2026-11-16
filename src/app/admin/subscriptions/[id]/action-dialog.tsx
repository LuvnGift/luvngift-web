'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useAdminSubscriptionAction,
  type AdminSubscriptionAction,
  type AdminSubscriptionDetail,
} from '@/hooks/use-admin';
import { shortDate } from '../labels';
import { ADMIN_REASON_MIN } from '@luvngift/shared';

/** The shortest reason the API accepts (adminSubscriptionActionSchema in @luvngift/shared). */
export const MIN_REASON = ADMIN_REASON_MIN;

export const ACTION_COPY: Record<AdminSubscriptionAction, { label: string; effect: (s: AdminSubscriptionDetail) => string }> = {
  SKIP: {
    label: 'Skip next delivery',
    effect: (s) =>
      s.billing === 'ANNUAL'
        ? 'The next delivery of the paid year moves one cycle later. Nothing is charged or refunded; the year still brings the same number of deliveries.'
        : `The next delivery is skipped and not charged. Charges resume on ${shortDate(s.currentPeriodEnd)}.`,
  },
  UNSKIP: { label: 'Restore next delivery', effect: () => 'The next delivery goes ahead and is charged as usual.' },
  PAUSE: { label: 'Pause', effect: () => 'Nothing is charged or delivered until the subscription is resumed.' },
  RESUME: { label: 'Resume', effect: () => 'Charges and deliveries continue on the usual schedule.' },
  CANCEL: {
    label: 'Cancel',
    effect: (s) =>
      s.billing === 'ANNUAL' && s.annualCancelQuote
        ? `Ends today, part-way through a paid year. ${s.annualCancelQuote.undelivered} deliveries not made are refunded at the price paid, less the ${s.annualCancelQuote.feePercent}% admin fee and the annual discount on those made: ${(s.annualCancelQuote.refund / 100).toFixed(2)} ${s.currency} back to the card (Refund Policy § 6).`
        : s.stripeSubscriptionId
        ? `Ends after the current period (${shortDate(s.currentPeriodEnd)}). The delivery already paid for still arrives; nothing more is charged. No refund is issued: refund a delivery from its order.`
        : 'Stripe never set this subscription up, so it is cancelled straight away.',
  },
  UNCANCEL: { label: 'Keep subscription going', effect: () => 'The subscription no longer ends and carries on as usual.' },
};

/** What the subscriber could do themselves right now — an admin can do no more. */
export function actionsFor(s: AdminSubscriptionDetail): AdminSubscriptionAction[] {
  if (s.status === 'CANCELLED') return [];
  if (!s.stripeSubscriptionId) return ['CANCEL'];
  const ending: AdminSubscriptionAction = s.cancelAtPeriodEnd ? 'UNCANCEL' : 'CANCEL';
  if (s.status === 'PAUSED') return ['RESUME', ending];
  // A paid year cannot be paused (the API refuses it).
  if (s.billing === 'ANNUAL') return [s.skipNextCycle ? 'UNSKIP' : 'SKIP', ending];
  return [s.skipNextCycle ? 'UNSKIP' : 'SKIP', 'PAUSE', ending];
}

export function ActionDialog({
  sub,
  action,
  onClose,
}: {
  sub: AdminSubscriptionDetail;
  action: AdminSubscriptionAction;
  onClose: () => void;
}) {
  const act = useAdminSubscriptionAction();
  const [reason, setReason] = useState('');
  const copy = ACTION_COPY[action];
  const canSave = reason.trim().length >= MIN_REASON && !act.isPending;

  const save = async () => {
    try {
      await act.mutateAsync({ id: sub.id, action, reason: reason.trim() });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !act.isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.label}</DialogTitle>
          <DialogDescription>{copy.effect(sub)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="action-reason">Reason (emailed to the subscriber)</Label>
          <Textarea
            id="action-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. You asked us by WhatsApp to pause while you travel."
          />
          {reason.trim().length > 0 && reason.trim().length < MIN_REASON && (
            <p className="text-xs text-muted-foreground">A few more words, please.</p>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={save} disabled={!canSave} variant={action === 'CANCEL' ? 'destructive' : 'default'}>
            {act.isPending ? <><Spinner size="sm" className="mr-2" />Saving…</> : 'Confirm and email subscriber'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={act.isPending}>Back</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

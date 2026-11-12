'use client';

/**
 * Recording a partner payment, or cancelling a payout, from Admin → Payouts or
 * an order's partner panel. Money moves by bank transfer outside the app; this
 * records it. Both need a fresh 2FA code; recording a payment also needs the
 * bank's transfer receipt, and the partner must have verified bank details
 * (the API refuses otherwise and says so).
 *
 * Field rules come from @luvngift/shared, the same schemas the API validates.
 */

import { useState } from 'react';
import Link from 'next/link';
import { payoutCancelSchema, payoutPaidSchema } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { nairaLabel, useCancelPayout, useMarkPayoutPaid, type PayableAccount } from '@/hooks/use-partners';

const MAX_PROOF_BYTES = 10 * 1024 * 1024; // the API's image cap
const PROOF_TYPES = 'image/jpeg,image/png,image/webp,image/heic';

export interface PayoutActionTarget {
  id: string;
  amountNgn: number;
  vendorId: string;
  partnerName: string;
  /** The partner's current account, when the caller knows it (undefined = not loaded here). */
  account?: PayableAccount | null;
}

export function PayoutActionDialog({
  target,
  mode,
  onClose,
}: {
  target: PayoutActionTarget | null;
  mode: 'pay' | 'cancel';
  onClose: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {target && (mode === 'pay' ? <PayForm target={target} onDone={onClose} /> : <CancelForm target={target} onDone={onClose} />)}
      </DialogContent>
    </Dialog>
  );
}

function TotpField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">2FA code</span>
      <Input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="6-digit code from your authenticator app"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
    </label>
  );
}

function PayForm({ target, onDone }: { target: PayoutActionTarget; onDone: () => void }) {
  const markPaid = useMarkPayoutPaid();
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [proofError, setProofError] = useState('');

  const parsed = payoutPaidSchema.safeParse({ reference, note: note || undefined, totpCode });
  const firstError = parsed.success ? null : parsed.error.issues[0]?.message;
  const unpayable = target.account !== undefined && target.account?.status !== 'VERIFIED';

  function pickProof(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setProofError(file && file.size > MAX_PROOF_BYTES ? 'The receipt image must be 10MB or smaller.' : '');
    setProof(file);
  }

  function submit() {
    if (!parsed.success || !proof || proofError) return;
    markPaid.mutate({ id: target.id, ...parsed.data, proof }, { onSuccess: onDone });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record payment to {target.partnerName}</DialogTitle>
        <DialogDescription>
          Send {nairaLabel(target.amountNgn)} by bank transfer first, then record it here. This cannot be undone: a mistake
          is corrected with a later adjustment.
        </DialogDescription>
      </DialogHeader>

      {target.account?.status === 'VERIFIED' && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          Pay to <strong>{target.account.bankName}</strong>, account ending <strong>{target.account.accountLast4}</strong>,{' '}
          {target.account.accountName}
        </p>
      )}
      {unpayable && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {target.account ? 'Their bank details are not verified yet.' : 'They have no bank details on file.'}{' '}
          <Link href={`/admin/vendors/${target.vendorId}`} className="underline">Open their profile</Link> to add or verify them before paying.
        </p>
      )}

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Bank transfer reference</span>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="As shown on the bank receipt" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Transfer receipt</span>
          <Input type="file" accept={PROOF_TYPES} onChange={pickProof} />
          {proofError && <span className="text-xs text-destructive">{proofError}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Note (optional)</span>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <TotpField value={totpCode} onChange={setTotpCode} />
        {reference && totpCode.length === 6 && firstError && <p className="text-xs text-destructive">{firstError}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Close</Button>
        <Button disabled={!parsed.success || !proof || !!proofError || unpayable || markPaid.isPending} onClick={submit}>
          {markPaid.isPending ? 'Recording…' : 'Record payment'}
        </Button>
      </DialogFooter>
    </>
  );
}

function CancelForm({ target, onDone }: { target: PayoutActionTarget; onDone: () => void }) {
  const cancel = useCancelPayout();
  const [reason, setReason] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const parsed = payoutCancelSchema.safeParse({ reason, totpCode });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cancel {nairaLabel(target.amountNgn)} due to {target.partnerName}</DialogTitle>
        <DialogDescription>Only a payout that has not been paid can be cancelled. The reason is kept in the partner&apos;s payment history.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Reason</span>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <TotpField value={totpCode} onChange={setTotpCode} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Close</Button>
        <Button
          variant="destructive"
          disabled={!parsed.success || cancel.isPending}
          onClick={() => parsed.success && cancel.mutate({ id: target.id, ...parsed.data }, { onSuccess: onDone })}
        >
          Cancel payout
        </Button>
      </DialogFooter>
    </>
  );
}

'use client';

import { useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useRefundOrder, useRefundRequest } from '@/hooks/use-admin';

/** Stripe statuses where money is moving or has moved back (mirrors the API). */
const OPEN = ['pending', 'requires_action', 'succeeded'];
const TARGET_BUSINESS_DAYS = 5;

interface RefundRow {
  id: string;
  amount: number;
  status: string;
  reason: string | null;
  actorEmail: string | null;
  createdAt: string;
}

const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency}`;

const statusClass: Record<string, string> = {
  succeeded: 'text-green-700',
  pending: 'text-amber-700',
  requires_action: 'text-amber-700',
  failed: 'text-red-700',
  canceled: 'text-red-700',
};

/** Business days (Mon–Fri) elapsed since `iso`, matching the API's daily check. */
function businessDaysSince(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  let days = 0;
  while (d < now) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (d <= now && wd !== 0 && wd !== 6) days += 1;
  }
  return days;
}

/**
 * Refunds for one order: the request clock (Refund Policy § 7), refund history,
 * and issuing a full or partial refund. Every rule is enforced by the API; this
 * only shows what is left to refund so the admin is not guessing.
 */
export function RefundSection({ order }: { order: any }) {
  const [dialog, setDialog] = useState<'refund' | 'log' | 'close' | null>(null);
  const payment = order.payment;
  if (!payment || payment.status === 'PENDING' || payment.status === 'FAILED') return null;

  const refunds: RefundRow[] = order.refunds ?? [];
  const refunded = refunds.filter((r) => OPEN.includes(r.status)).reduce((n, r) => n + r.amount, 0);
  const remaining = Math.max(payment.amount - refunded, 0);
  const requestAge = order.refundRequestedAt ? businessDaysSince(order.refundRequestedAt) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Refunds</p>
        <span className="text-xs text-muted-foreground">
          {money(refunded, payment.currency)} of {money(payment.amount, payment.currency)} refunded
        </span>
      </div>

      {order.refundRequestedAt && (
        <div
          className={`rounded-md border p-3 text-sm ${
            requestAge! >= TARGET_BUSINESS_DAYS ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
          }`}
        >
          <p className="flex items-center gap-1.5 font-medium">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Refund requested {new Date(order.refundRequestedAt).toLocaleDateString()} ·{' '}
            {requestAge} of {TARGET_BUSINESS_DAYS} business days
          </p>
          {order.refundRequestNote && <p className="mt-1 text-muted-foreground">{order.refundRequestNote}</p>}
        </div>
      )}

      {refunds.length > 0 && (
        <ul className="divide-y rounded-md border text-sm">
          {refunds.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div>
                <span className="font-medium">{money(r.amount, payment.currency)}</span>
                {r.reason && <span className="text-muted-foreground"> · {r.reason}</span>}
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()} · {r.actorEmail ?? 'Stripe dashboard'}
                </p>
              </div>
              <span className={`text-xs font-semibold ${statusClass[r.status] ?? ''}`}>{r.status}</span>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDialog('refund')}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Issue refund
          </Button>
          {order.refundRequestedAt ? (
            <Button size="sm" variant="ghost" onClick={() => setDialog('close')}>
              Close request without refund
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setDialog('log')}>
              Log refund request
            </Button>
          )}
        </div>
      )}

      {dialog === 'refund' && (
        <IssueRefundDialog order={order} remaining={remaining} onClose={() => setDialog(null)} />
      )}
      {(dialog === 'log' || dialog === 'close') && (
        <RefundRequestDialog orderId={order.id} close={dialog === 'close'} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

function IssueRefundDialog({ order, remaining, onClose }: { order: any; remaining: number; onClose: () => void }) {
  const refund = useRefundOrder();
  const currency = order.payment.currency;
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const cents = mode === 'full' ? remaining : Math.round(parseFloat(amount || '0') * 100);
  const valid = cents > 0 && cents <= remaining;

  const submit = () => {
    if (!valid) return;
    refund.mutate(
      {
        id: order.id,
        ...(mode === 'partial' ? { amount: cents } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !refund.isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue a refund</DialogTitle>
          <DialogDescription>
            Refunds go back to the customer&apos;s card in {currency}. {money(remaining, currency)} can still be refunded.
            The customer is emailed automatically.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="sr-only">Refund type</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="mode" checked={mode === 'full'} onChange={() => setMode('full')} />
            Everything remaining ({money(remaining, currency)})
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="mode" checked={mode === 'partial'} onChange={() => setMode('partial')} />
            Part of it (for example, one item that could not be supplied)
          </label>
        </fieldset>

        {mode === 'partial' && (
          <div className="space-y-1.5">
            <Label htmlFor="refund-amount">Amount ({currency})</Label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            />
            {amount && !valid && (
              <p className="text-xs text-destructive">Enter an amount up to {money(remaining, currency)}.</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="refund-reason">Reason (internal, kept in the audit log)</Label>
          <Textarea id="refund-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={refund.isPending}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={!valid || refund.isPending}>
            {refund.isPending ? <Spinner size="sm" className="mr-2" /> : null}
            Refund {valid ? money(cents, currency) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefundRequestDialog({ orderId, close, onClose }: { orderId: string; close: boolean; onClose: () => void }) {
  const request = useRefundRequest();
  const [note, setNote] = useState('');

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !request.isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{close ? 'Close the refund request' : 'Log a refund request'}</DialogTitle>
          <DialogDescription>
            {close
              ? 'Use this when no refund is due (for example, the customer withdrew the request). It stops the 5-business-day clock.'
              : 'Record that the customer asked for a refund. You will be alerted if it is not refunded within 5 business days.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="refund-request-note">Note</Label>
          <Textarea
            id="refund-request-note"
            rows={3}
            maxLength={1000}
            placeholder={close ? 'Why no refund is due' : 'What the customer asked for, and where (email, chat)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={request.isPending}>Cancel</Button>
          <Button
            onClick={() => request.mutate({ id: orderId, note: note.trim() || undefined, close }, { onSuccess: onClose })}
            disabled={request.isPending}
          >
            {request.isPending ? <Spinner size="sm" className="mr-2" /> : null}
            {close ? 'Close request' : 'Log request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

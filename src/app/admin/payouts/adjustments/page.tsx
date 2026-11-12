'use client';

/**
 * Corrections to what partners are owed, netted off in the next batch. Add
 * one from the partner's profile. A wrong one is cancelled while still due
 * and a new one added; nothing is edited.
 */

import { useState } from 'react';
import Link from 'next/link';
import { payoutCancelSchema } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TotpField } from '@/components/admin/payout-action-dialog';
import { nairaLabel, useCancelAdjustment, usePartnerAdjustments } from '@/hooks/use-partners';
import type { PartnerAdjustmentView } from '@luvngift/shared';
import { PayoutsNav } from '../payouts-nav';

const STATUSES = [
  { value: 'DUE', label: 'Due' },
  { value: 'BATCHED', label: 'In a batch' },
  { value: 'PAID', label: 'Settled' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All' },
];
const signedNaira = (kobo: number) => `${kobo < 0 ? '−' : '+'}${nairaLabel(Math.abs(kobo))}`;

export default function AdjustmentsPage() {
  const [status, setStatus] = useState('DUE');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<PartnerAdjustmentView | null>(null);
  const { data, isLoading } = usePartnerAdjustments({ status: status || undefined, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner payouts</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          + means we owe the partner more; − means they owe us (an overpayment, or an order paid and then cancelled). The
          next batch nets them off, and the reason appears on the partner&apos;s statement. Add one from the partner&apos;s profile.
        </p>
      </div>
      <PayoutsNav />

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button key={s.value} size="sm" variant={status === s.value ? 'default' : 'outline'} onClick={() => { setStatus(s.value); setPage(1); }}>
            {s.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !data?.data.length ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
              <tr>{['Partner', 'Amount', 'Reason', 'Added', ''].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.data.map((a) => (
                <tr key={a.id} className="border-t align-top">
                  <td className="px-3 py-2"><Link href={`/admin/vendors/${a.vendorId}`} className="font-medium hover:underline">{a.vendorName}</Link></td>
                  <td className={`px-3 py-2 font-medium ${a.amountNgn < 0 ? 'text-red-700' : 'text-green-700'}`}>{signedNaira(a.amountNgn)}</td>
                  <td className="px-3 py-2 text-xs">
                    {a.reason}
                    {a.status === 'CANCELLED' && <p className="text-muted-foreground">Cancelled: {a.cancelledReason}</p>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()} · {a.createdByEmail}</td>
                  <td className="px-3 py-2">
                    {a.status === 'DUE' && <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => setCancelling(a)}>Cancel</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {data.meta.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={!!cancelling} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent className="max-w-md">{cancelling && <CancelForm adjustment={cancelling} onDone={() => setCancelling(null)} />}</DialogContent>
      </Dialog>
    </div>
  );
}

function CancelForm({ adjustment, onDone }: { adjustment: PartnerAdjustmentView; onDone: () => void }) {
  const cancel = useCancelAdjustment();
  const [reason, setReason] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const parsed = payoutCancelSchema.safeParse({ reason, totpCode });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Cancel {signedNaira(adjustment.amountNgn)} for {adjustment.vendorName}</DialogTitle>
        <DialogDescription>{adjustment.reason}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Why</span>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <TotpField value={totpCode} onChange={setTotpCode} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Close</Button>
        <Button variant="destructive" disabled={!parsed.success || cancel.isPending} onClick={() => parsed.success && cancel.mutate({ id: adjustment.id, ...parsed.data }, { onSuccess: onDone })}>
          Cancel adjustment
        </Button>
      </DialogFooter>
    </>
  );
}

'use client';

/**
 * One payout batch: download the bank file, send the transfers from the bank,
 * then record each one as paid (reference + the bank's receipt) or not sent
 * (its items fall due again). Each needs your 2FA code. A paid transfer sends
 * the partner a statement of what it covered.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { shortId, transferFailedSchema, transferPaidSchema } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TotpField } from '@/components/admin/payout-action-dialog';
import {
  nairaLabel,
  useExportPayoutBatch,
  useMarkTransferFailed,
  useMarkTransferPaid,
  usePayoutBatch,
  type PayoutBatchDetail,
} from '@/hooks/use-partners';
import { PayoutsNav } from '../../payouts-nav';

type Transfer = PayoutBatchDetail['transfers'][number];

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const signedNaira = (kobo: number) => `${kobo < 0 ? '−' : ''}${nairaLabel(Math.abs(kobo))}`;

export default function PayoutBatchPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePayoutBatch(id);
  const [action, setAction] = useState<{ transfer: Transfer; mode: 'paid' | 'failed' } | null>(null);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!data) return <p className="text-muted-foreground">Batch not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payout batch {data.reference}</h1>
        <p className="text-muted-foreground text-sm">
          Created {new Date(data.createdAt).toLocaleString()} by {data.createdByEmail}
          {data.note ? ` · ${data.note}` : ''}
        </p>
      </div>
      <PayoutsNav />

      <div className="flex flex-wrap gap-6 text-sm">
        <span>Total <strong>{nairaLabel(data.totalNgn)}</strong></span>
        <span>Paid <strong>{nairaLabel(data.paidNgn)}</strong></span>
        <span>{data.status === 'CLOSED' ? 'Closed' : `${data.pendingCount} of ${data.transferCount} still to record`}</span>
      </div>

      {data.pendingCount > 0 && <ExportPanel batch={data} />}

      <div className="space-y-3">
        {data.transfers.map((t) => (
          <TransferCard key={t.id} transfer={t} onPaid={() => setAction({ transfer: t, mode: 'paid' })} onFailed={() => setAction({ transfer: t, mode: 'failed' })} />
        ))}
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="max-w-md">
          {action?.mode === 'paid' && <PaidForm transfer={action.transfer} onDone={() => setAction(null)} />}
          {action?.mode === 'failed' && <FailedForm transfer={action.transfer} onDone={() => setAction(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExportPanel({ batch }: { batch: PayoutBatchDetail }) {
  const exportFile = useExportPayoutBatch(batch.id);
  const [totpCode, setTotpCode] = useState('');
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <p className="font-medium">Bank upload file</p>
      <p className="text-xs text-muted-foreground">
        A CSV of the transfers still to send, with full account numbers, for your bank&apos;s bulk-transfer upload. Upload it
        as it is: opening it in Excel drops the leading zero of account numbers that start with 0.
        {batch.exportedAt && ` First downloaded ${new Date(batch.exportedAt).toLocaleString()}.`}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56"><TotpField value={totpCode} onChange={setTotpCode} /></div>
        <Button size="sm" disabled={totpCode.length !== 6 || exportFile.isPending} onClick={() => exportFile.mutate({ totpCode }, { onSuccess: () => setTotpCode('') })}>
          Download bank file
        </Button>
      </div>
    </div>
  );
}

function TransferCard({ transfer: t, onPaid, onFailed }: { transfer: Transfer; onPaid: () => void; onFailed: () => void }) {
  return (
    <div className="rounded-md border p-3 text-sm space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/admin/vendors/${t.vendorId}`} className="font-medium hover:underline">{t.vendorName}</Link>
          <p className="text-xs text-muted-foreground">{t.bankName} ••••{t.accountLast4} · {t.accountName}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{nairaLabel(t.amountNgn)}</p>
          {t.status === 'PENDING' && (
            <div className="mt-1 flex gap-1.5">
              <Button size="sm" className="h-8" onClick={onPaid}>Record paid</Button>
              <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={onFailed}>Not sent</Button>
            </div>
          )}
        </div>
      </div>
      {t.status === 'PAID' && (
        <p className="text-xs text-green-700 flex flex-wrap items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Paid · ref {t.reference} · {t.settledAt && new Date(t.settledAt).toLocaleString()} · {t.settledByEmail}
          {t.proofUrl && (
            <a href={t.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              receipt <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </p>
      )}
      {t.status === 'FAILED' && (
        <p className="text-xs text-red-700 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Not sent: {t.failureReason}. Its items are due again.
        </p>
      )}
      {t.status !== 'FAILED' && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {t.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>{i.kind === 'PAYOUT' ? `Order ${i.orderId ? shortId(i.orderId) : ''} · ${i.label}` : `Adjustment: ${i.label}`}</span>
              <span>{signedNaira(i.amountNgn)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaidForm({ transfer, onDone }: { transfer: Transfer; onDone: () => void }) {
  const markPaid = useMarkTransferPaid();
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const tooBig = !!proof && proof.size > MAX_PROOF_BYTES;
  const parsed = transferPaidSchema.safeParse({ reference, note: note || undefined, totpCode });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record {nairaLabel(transfer.amountNgn)} paid to {transfer.vendorName}</DialogTitle>
        <DialogDescription>
          To {transfer.bankName} ••••{transfer.accountLast4} ({transfer.accountName}). Record it only once the bank shows it as
          sent. The partner is emailed and texted a statement.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Bank transfer reference</span>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Transfer receipt</span>
          <Input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
          {tooBig && <span className="text-xs text-destructive">The receipt image must be 10MB or smaller.</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Note (optional)</span>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <TotpField value={totpCode} onChange={setTotpCode} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Close</Button>
        <Button
          disabled={!parsed.success || !proof || tooBig || markPaid.isPending}
          onClick={() => parsed.success && proof && markPaid.mutate({ id: transfer.id, ...parsed.data, proof }, { onSuccess: onDone })}
        >
          {markPaid.isPending ? 'Recording…' : 'Record paid'}
        </Button>
      </DialogFooter>
    </>
  );
}

function FailedForm({ transfer, onDone }: { transfer: Transfer; onDone: () => void }) {
  const markFailed = useMarkTransferFailed();
  const [reason, setReason] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const parsed = transferFailedSchema.safeParse({ reason, totpCode });
  return (
    <>
      <DialogHeader>
        <DialogTitle>{transfer.vendorName}: transfer not sent</DialogTitle>
        <DialogDescription>
          Use this when the transfer was not sent, bounced or was reversed. Everything in it falls due again for a later batch,
          except payouts for orders that have been cancelled since, which are cancelled.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">What happened</span>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <TotpField value={totpCode} onChange={setTotpCode} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Close</Button>
        <Button variant="destructive" disabled={!parsed.success || markFailed.isPending} onClick={() => parsed.success && markFailed.mutate({ id: transfer.id, ...parsed.data }, { onSuccess: onDone })}>
          Mark not sent
        </Button>
      </DialogFooter>
    </>
  );
}

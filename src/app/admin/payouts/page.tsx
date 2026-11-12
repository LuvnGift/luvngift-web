'use client';

/**
 * What we owe fulfilment partners, and what we have paid them. Money moves by
 * bank transfer outside the app; each payment is recorded here with its
 * reference, so "who do we owe" is this page rather than a spreadsheet.
 */

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PayoutActionDialog, type PayoutActionTarget } from '@/components/admin/payout-action-dialog';
import { ROLE_LABELS, nairaLabel, usePayouts, type PayoutRow } from '@/hooks/use-partners';
import { PayoutsNav } from './payouts-nav';

const STATUSES = [
  { value: 'DUE', label: 'Due' },
  { value: 'BATCHED', label: 'In a batch' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All' },
];

const KIND_LABELS: Record<string, string> = { ADVANCE: 'Advance', REIMBURSEMENT: 'Reimbursement', BALANCE: 'On delivery' };
const ref = (id: string) => `#${id.slice(-8).toUpperCase()}`;

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState('DUE');
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePayouts({ status: status || undefined, page });
  const [action, setAction] = useState<{ target: PayoutActionTarget; mode: 'pay' | 'cancel' } | null>(null);
  const open = (mode: 'pay' | 'cancel') => (target: PayoutActionTarget) => setAction({ target, mode });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner payouts</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Advances fall due when a split-schedule partner is assigned (pay these the same day), and the rest once the
          order is delivered (pay these in the Friday run). Send the bank transfer first, then record it here with the
          reference and the bank&apos;s receipt. Recording or cancelling needs your 2FA code, and a partner can only be
          paid once their bank details are verified on their profile. To pay several at once, use a batch.
        </p>
      </div>
      <PayoutsNav />

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Button key={s.value} size="sm" variant={status === s.value ? 'default' : 'outline'} onClick={() => { setStatus(s.value); setPage(1); }}>
            {s.label}
          </Button>
        ))}
        {data && status === 'DUE' && (
          <span className="ml-auto text-sm">Total due <strong>{nairaLabel(data.dueNgn)}</strong></span>
        )}
      </div>

      {data && data.pendingReceipts > 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {data.pendingReceipts} receipt{data.pendingReceipts === 1 ? '' : 's'} waiting for review. Open the order to approve
          or reject {data.pendingReceipts === 1 ? 'it' : 'them'}: a reimbursement only falls due once approved.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !data?.data.length ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
              <tr>
                {['Partner', 'Order', 'For', 'Amount', 'Since', 'Payment'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>{data.data.map((p) => <Row key={p.id} payout={p} onPay={open('pay')} onCancel={open('cancel')} />)}</tbody>
          </table>
        </div>
      )}

      <PayoutActionDialog target={action?.target ?? null} mode={action?.mode ?? 'pay'} onClose={() => setAction(null)} />

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {data.meta.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function Row({
  payout,
  onPay,
  onCancel,
}: {
  payout: PayoutRow;
  onPay: (t: PayoutActionTarget) => void;
  onCancel: (t: PayoutActionTarget) => void;
}) {
  const account = payout.vendor.bankAccounts[0] ?? null;
  const target: PayoutActionTarget = {
    id: payout.id,
    amountNgn: payout.amountNgn,
    vendorId: payout.vendor.id,
    partnerName: payout.vendor.name,
    account,
  };
  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2">
        <Link href={`/admin/vendors/${payout.vendor.id}`} className="font-medium hover:underline">{payout.vendor.name}</Link>
        <p className="text-xs text-muted-foreground">{payout.vendor.phone}</p>
        {payout.status === 'DUE' && (
          <p className={`text-xs ${account?.status === 'VERIFIED' ? 'text-muted-foreground' : 'text-amber-700'}`}>
            {account
              ? `${account.bankName} ••••${account.accountLast4}${account.status === 'VERIFIED' ? '' : ' (not verified)'}`
              : 'No bank details'}
          </p>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-xs">{ref(payout.line.orderId)}</td>
      <td className="px-3 py-2 text-xs">{ROLE_LABELS[payout.line.role]} · {KIND_LABELS[payout.kind]}</td>
      <td className="px-3 py-2 font-medium">{nairaLabel(payout.amountNgn)}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(payout.createdAt).toLocaleDateString()}</td>
      <td className="px-3 py-2">
        {payout.status === 'PAID' && (
          <div className="text-xs space-y-0.5">
            <span className="text-green-700 inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {payout.reference}</span>
            {payout.bankAccount && (
              <p className="text-muted-foreground">to {payout.bankAccount.bankName} ••••{payout.bankAccount.accountLast4}</p>
            )}
            {payout.proofUrl && (
              <a href={payout.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Receipt <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
        {payout.status === 'CANCELLED' && <span className="text-xs text-muted-foreground">Cancelled: {payout.cancelledReason}</span>}
        {payout.status === 'BATCHED' && payout.transfer && (
          <Link href={`/admin/payouts/batches/${payout.transfer.batchId}`} className="text-xs text-primary hover:underline">In a payout batch</Link>
        )}
        {payout.status === 'DUE' && (
          <div className="flex gap-1.5">
            <Button size="sm" className="h-8" onClick={() => onPay(target)}>Record payment</Button>
            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => onCancel(target)}>Cancel</Button>
          </div>
        )}
      </td>
    </tr>
  );
}

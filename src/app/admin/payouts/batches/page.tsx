'use client';

/**
 * Payout runs. The preview shows what every partner is owed today, netted
 * against their adjustments. Creating a batch (2FA) reserves the chosen
 * partners' money into one transfer each, in one step: there is no draft, so
 * nothing can be paid twice. Weekly run on Fridays; split-schedule advances
 * go out the same day in a batch of their own.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BATCH_EXCLUSION_LABELS, createPayoutBatchSchema } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { TotpField } from '@/components/admin/payout-action-dialog';
import { nairaLabel, useBatchPreview, useCreatePayoutBatch, usePayoutBatches } from '@/hooks/use-partners';
import { PayoutsNav } from '../payouts-nav';

const signedNaira = (kobo: number) => `${kobo < 0 ? '−' : ''}${nairaLabel(Math.abs(kobo))}`;
const days = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export default function PayoutBatchesPage() {
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = usePayoutBatches({ page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner payouts</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          A batch pays each chosen partner everything they are owed in one transfer, with adjustments netted off. Run one
          every Friday, and one the same day for advances owed to split-schedule partners.
        </p>
      </div>
      <PayoutsNav />

      {creating ? (
        <NewBatch onCancel={() => setCreating(false)} />
      ) : (
        <Button onClick={() => setCreating(true)}>New batch</Button>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Batches</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !data?.data.length ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No batches yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
                <tr>{['Batch', 'Created', 'Partners', 'Total', 'Status'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.data.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-2"><Link href={`/admin/payouts/batches/${b.id}`} className="font-mono text-xs font-medium hover:underline">{b.reference}</Link></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString()} · {b.createdByEmail}</td>
                    <td className="px-3 py-2">{b.transferCount}</td>
                    <td className="px-3 py-2 font-medium">{nairaLabel(b.totalNgn)}</td>
                    <td className="px-3 py-2 text-xs">
                      {b.status === 'CLOSED' ? <span className="text-muted-foreground">Closed</span> : <span className="text-amber-700">{b.pendingCount} to record</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {data.meta.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Older</Button>
          </div>
        )}
      </section>
    </div>
  );
}

function NewBatch({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const { data, isLoading } = useBatchPreview();
  const create = useCreatePayoutBatch();
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [totpCode, setTotpCode] = useState('');

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  const partners = data?.partners ?? [];
  const chosen = partners.filter((p) => !p.excluded && !unchecked.has(p.vendorId));
  const total = chosen.reduce((s, p) => s + p.netNgn, 0);
  const parsed = createPayoutBatchSchema.safeParse({ vendorIds: chosen.map((p) => p.vendorId), note: note || undefined, totpCode });

  const toggle = (id: string) => {
    const next = new Set(unchecked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setUnchecked(next);
  };

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">New batch</h2>
      {!partners.length ? (
        <p className="text-muted-foreground text-sm">Nobody is owed anything right now.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
              <tr>{['', 'Partner', 'Pays to', 'Items', 'Waiting', 'Net'].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.vendorId} className={`border-t ${p.excluded ? 'text-muted-foreground' : ''}`}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      aria-label={`Pay ${p.name}`}
                      disabled={!!p.excluded}
                      checked={!p.excluded && !unchecked.has(p.vendorId)}
                      onChange={() => toggle(p.vendorId)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/vendors/${p.vendorId}`} className="font-medium hover:underline">{p.name}</Link>
                    {p.excluded && <p className="text-xs text-amber-700">{BATCH_EXCLUSION_LABELS[p.excluded]}</p>}
                  </td>
                  <td className="px-3 py-2 text-xs">{p.account ? `${p.account.bankName} ••••${p.account.accountLast4}` : '—'}</td>
                  <td className="px-3 py-2">{p.itemCount}</td>
                  <td className="px-3 py-2 text-xs">{days(p.oldestDueAt)} days</td>
                  <td className="px-3 py-2 font-medium">{signedNaira(p.netNgn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Note (optional)</span>
          <Input placeholder="e.g. Friday run, or Advances for Tuesday's orders" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <TotpField value={totpCode} onChange={setTotpCode} />
      </div>
      <p className="text-sm">
        {chosen.length} partner{chosen.length === 1 ? '' : 's'}, <strong>{nairaLabel(total)}</strong>. Creating the batch reserves this money:
        it cannot be paid any other way until each transfer is recorded as paid or not sent.
      </p>
      <div className="flex gap-2">
        <Button
          disabled={!parsed.success || create.isPending}
          onClick={() => parsed.success && create.mutate(parsed.data, { onSuccess: (b) => router.push(`/admin/payouts/batches/${b.id}`) })}
        >
          {create.isPending ? 'Creating…' : 'Create batch'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </section>
  );
}

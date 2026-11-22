'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';
import { StaffPermission, VETTING_KINDS, VETTING_LABELS, type OpsPartnerDetail } from '@luvngift/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useOpsPartner, useOpsSetVettingCheck } from '@/hooks/use-ops';
import { BANK_LABELS, NotesPanel, StatusBadge, formatDate, useOpsCan } from '@/components/ops/ops-ui';

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);

function VettingRow({ partner, kind }: { partner: OpsPartnerDetail; kind: (typeof VETTING_KINDS)[number] }) {
  const can = useOpsCan(StaffPermission.PARTNER_VETTING);
  const save = useOpsSetVettingCheck(partner.id);
  const check = partner.vettingChecks.find((c) => c.kind === kind);
  const [note, setNote] = useState(check?.note ?? '');
  const status = check?.status ?? 'PENDING';
  const set = (next: 'PASSED' | 'FAILED' | 'PENDING') => save.mutate({ kind, status: next, note: note.trim() || undefined });

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{VETTING_LABELS[kind]}</p>
          <p className="text-muted-foreground text-xs">
            {status === 'PENDING' ? 'Not done yet' : `${status === 'PASSED' ? 'Passed' : 'Failed'} ${formatDate(check?.checkedAt)}`}
            {check?.note ? ` · ${check.note}` : ''}
          </p>
        </div>
        <Badge variant={status === 'PASSED' ? 'default' : status === 'FAILED' ? 'destructive' : 'secondary'}>{status}</Badge>
      </div>
      {can && (
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-[220px] flex-1" placeholder="What you checked (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" disabled={save.isPending} onClick={() => set('PASSED')}>Passed</Button>
          <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => set('FAILED')}>Failed</Button>
        </div>
      )}
    </li>
  );
}

/**
 * One partner, for the person on the ground: contact, coverage, vetting,
 * performance and recent work. No pay terms, payouts or bank account numbers:
 * only whether bank details are on file and checked.
 */
export default function OpsPartnerPage() {
  const { id } = useParams<{ id: string }>();
  const { data: p, isLoading, isError } = useOpsPartner(id);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (isError || !p) return <p className="text-muted-foreground py-16 text-center">Partner not found.</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/ops/partners" className="text-muted-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" /> Partners
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        <Badge variant={p.status === 'APPROVED' ? 'default' : 'secondary'}>{p.status === 'PENDING' ? 'Applying' : p.status.toLowerCase()}</Badge>
        {!p.isActive && <Badge variant="destructive">Inactive</Badge>}
      </div>

      <Card>
        <CardContent className="space-y-1 p-6 text-sm">
          <p>{p.contactName ?? '—'} · <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 underline"><Phone className="h-3 w-3" />{p.phone}</a> · {p.email}</p>
          <p className="text-muted-foreground">{p.address}</p>
          <p>Covers: {p.states.join(', ') || 'no states yet'}</p>
          {p.portfolioUrl && <p>Portfolio: <a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer" className="underline">{p.portfolioUrl}</a></p>}
          {p.cacNumber && <p>CAC: {p.cacNumber}</p>}
          <p>{BANK_LABELS[p.bankStatus]}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-6 text-sm md:grid-cols-4">
          <div><p className="text-muted-foreground text-xs">Score</p><p className="text-xl font-semibold">{p.score?.score ?? '—'}</p></div>
          <div><p className="text-muted-foreground text-xs">Average rating</p><p className="text-xl font-semibold">{p.score?.averageRating ?? '—'}</p></div>
          <div><p className="text-muted-foreground text-xs">On time</p><p className="text-xl font-semibold">{pct(p.score?.onTimeRate)}</p></div>
          <div><p className="text-muted-foreground text-xs">Recipient confirmed</p><p className="text-xl font-semibold">{pct(p.score?.confirmationRate)}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold">Vetting</h2>
          <p className="text-muted-foreground text-sm">
            {p.vetting.passed} of {p.vetting.required} required checks passed. Head office approves the partner once all
            required checks pass.
          </p>
          <ul className="divide-y">
            {VETTING_KINDS.map((k) => <VettingRow key={k} partner={p} kind={k} />)}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 font-semibold">Recent orders</h2>
          {p.recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">None yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {p.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <Link href={`/ops/orders/${o.id}`} className="font-medium underline">{o.reference}</Link>
                    <span className="text-muted-foreground ml-2">{o.deliveryCity} · {formatDate(o.createdAt)}</span>
                  </span>
                  <StatusBadge order={o} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {p.ratings.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-2 font-semibold">Ratings</h2>
            <ul className="divide-y text-sm">
              {p.ratings.map((r) => (
                <li key={r.orderId} className="py-2">
                  <Link href={`/ops/orders/${r.orderId}`} className="underline">{r.reference}</Link>
                  <span className="text-muted-foreground ml-2">
                    Punctuality {r.punctuality} · Quality {r.quality} · Communication {r.communication}
                    {r.packaging !== null ? ` · Packaging ${r.packaging}` : ''} · {formatDate(r.createdAt)}
                  </span>
                  {r.note && <p className="text-muted-foreground text-xs">{r.note}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <NotesPanel targetType="PARTNER" targetId={p.id} />
    </div>
  );
}

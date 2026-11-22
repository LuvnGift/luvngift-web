'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NIGERIAN_STATES } from '@luvngift/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useOpsPartners, type OpsPartnerParams } from '@/hooks/use-ops';
import { Pager, formatDate } from '@/components/ops/ops-ui';

const STATUS_LABELS = { PENDING: 'Applying', APPROVED: 'Approved', REJECTED: 'Rejected' } as const;

export default function OpsPartnersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PartnersList />
    </Suspense>
  );
}

function PartnersList() {
  const [search, setSearch] = useState('');
  // Coverage links here with ?state= to show who is applying in a state.
  const [state, setState] = useState(useSearchParams().get('state') ?? '');
  const [status, setStatus] = useState<OpsPartnerParams['status'] | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOpsPartners({
    page,
    search: search.trim() || undefined,
    state: state || undefined,
    status: status || undefined,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Partners</h1>
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Search partners"
          className="w-64"
          placeholder="Name, contact or email"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          aria-label="State"
          className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
          value={state}
          onChange={(e) => { setState(e.target.value); setPage(1); }}
        >
          <option value="">All states</option>
          {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          aria-label="Status"
          className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value as OpsPartnerParams['status'] | ''); setPage(1); }}
        >
          <option value="">Any status</option>
          <option value="PENDING">Applying</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (data?.data ?? []).length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">No partners match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="p-3">Partner</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Open orders</th>
                    <th className="p-3">Link last opened</th>
                    <th className="p-3">Vetting</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data!.data.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3">
                        <Link href={`/ops/partners/${p.id}`} className="font-medium underline underline-offset-2">{p.name}</Link>
                        <p className="text-muted-foreground text-xs">{p.states.join(', ') || p.state}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant={p.status === 'APPROVED' ? 'default' : 'secondary'}>{STATUS_LABELS[p.status]}</Badge>
                        {!p.isActive && <Badge variant="destructive" className="ml-1">Inactive</Badge>}
                      </td>
                      <td className="p-3 tabular-nums">{p.score?.score ?? '—'}</td>
                      <td className="p-3 tabular-nums">{p.openOrders}</td>
                      <td className="p-3">{formatDate(p.lastLinkUsedAt)}</td>
                      <td className="p-3 tabular-nums">{p.vetting.passed}/{p.vetting.required}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {data && <Pager page={page} totalPages={data.meta.totalPages} onPage={setPage} />}
    </div>
  );
}

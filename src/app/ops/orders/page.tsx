'use client';

import Link from 'next/link';
import { useState } from 'react';
import { NIGERIAN_STATES, OPS_ORDER_VIEWS, type OpsOrderView } from '@luvngift/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useOpsOrders } from '@/hooks/use-ops';
import { Pager, StatusBadge, formatDate } from '@/components/ops/ops-ui';

const VIEW_LABELS: Record<OpsOrderView, string> = { open: 'Open', delivered: 'Delivered', all: 'All' };
const KIND_LABELS = { BUNDLE: 'Gift bundle', SUBSCRIPTION: 'Subscription', CUSTOM: 'Custom gift' } as const;

/** Paid orders only. Recipient side only: no buyer, no amounts. */
export default function OpsOrdersPage() {
  const [view, setView] = useState<OpsOrderView>('open');
  const [state, setState] = useState('');
  const [reference, setReference] = useState('');
  const [page, setPage] = useState(1);
  const ref = /^#?[A-Za-z0-9]{4,8}$/.test(reference.trim()) ? reference.trim() : undefined;
  const { data, isLoading } = useOpsOrders({ page, view, state: state || undefined, reference: ref });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-lg border p-1">
          {OPS_ORDER_VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setPage(1); }}
              className={`rounded-md px-3 py-1 text-sm ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <select
          aria-label="State"
          className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
          value={state}
          onChange={(e) => { setState(e.target.value); setPage(1); }}
        >
          <option value="">All states</option>
          {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Input
          aria-label="Order reference"
          className="w-44"
          placeholder="#AB12CD34"
          value={reference}
          onChange={(e) => { setReference(e.target.value); setPage(1); }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (data?.data ?? []).length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">No orders match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Partner</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Due by</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data!.data.map((o) => (
                    <tr key={o.id}>
                      <td className="p-3">
                        <Link href={`/ops/orders/${o.id}`} className="font-medium underline underline-offset-2">{o.reference}</Link>
                        <p className="text-muted-foreground text-xs">{KIND_LABELS[o.kind]} · {formatDate(o.createdAt)}</p>
                      </td>
                      <td className="p-3">{o.recipientName}<p className="text-muted-foreground text-xs">{o.deliveryCity}, {o.deliveryState}</p></td>
                      <td className="p-3">{o.partner?.name ?? <span className="text-muted-foreground">None yet</span>}</td>
                      <td className="p-3"><StatusBadge order={o} /></td>
                      <td className="p-3">{formatDate(o.dueBy)}</td>
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

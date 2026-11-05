'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, type Currency } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useAdminSubscriptions,
  useAdminPlans,
  useVendors,
  type AdminSubscriptionFilters,
  type SubscriptionStatus,
} from '@/hooks/use-admin';
import { STATUS_LABEL, StatusPill, NotePill, cadenceLabel, personName, shortDate } from './labels';

const STATUSES: SubscriptionStatus[] = ['ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED'];
const PAGE_SIZE = 25;
const selectClass = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner size="lg" /></div>}>
      <SubscriptionsList />
    </Suspense>
  );
}

/** Filters live in the URL, so a link from a plan or an alert lands on the right list. */
function useFilters(): [AdminSubscriptionFilters, (next: Partial<AdminSubscriptionFilters>) => void] {
  const router = useRouter();
  const params = useSearchParams();
  const filters: AdminSubscriptionFilters = {
    page: Number(params.get('page') ?? 1) || 1,
    limit: PAGE_SIZE,
    status: (params.get('status') as SubscriptionStatus) || undefined,
    planId: params.get('planId') || undefined,
    vendorId: params.get('vendorId') || undefined,
    q: params.get('q') || undefined,
  };
  const update = (next: Partial<AdminSubscriptionFilters>) => {
    const merged = { ...filters, page: 1, ...next };
    const query = new URLSearchParams();
    for (const key of ['status', 'planId', 'vendorId', 'q'] as const) {
      if (merged[key]) query.set(key, String(merged[key]));
    }
    if (merged.page && merged.page > 1) query.set('page', String(merged.page));
    router.replace(`/admin/subscriptions${query.size ? `?${query}` : ''}`);
  };
  return [filters, update];
}

function SubscriptionsList() {
  const [filters, setFilters] = useFilters();
  const { data, isLoading, isFetching } = useAdminSubscriptions(filters);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Every recurring gift. Open one to see its deliveries, change its box or standing vendor, or
          skip, pause or cancel on the subscriber&apos;s behalf. Each change needs a reason and is
          emailed to them.
        </p>
      </div>

      <Filters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No subscriptions match these filters.
        </div>
      ) : (
        <ul className={`divide-y rounded-lg border ${isFetching ? 'opacity-70' : ''}`}>
          {rows.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/subscriptions/${s.id}`} className="block p-4 hover:bg-muted/50">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium flex items-center gap-2 flex-wrap">
                      {personName(s.user)}
                      <StatusPill status={s.status} />
                      {s.skipNextCycle && <NotePill>Skipping next</NotePill>}
                      {s.cancelAtPeriodEnd && <NotePill tone="red">Ends {shortDate(s.currentPeriodEnd)}</NotePill>}
                      {!s.plan.isActive && <NotePill>Retired plan</NotePill>}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {s.plan.name} · {cadenceLabel(s.interval)} · to {s.address.recipientName},{' '}
                      {s.address.city}, {s.address.state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.user.email} · {s._count.orders} deliver{s._count.orders === 1 ? 'y' : 'ies'} ·{' '}
                      {s.vendor ? (
                        <span className={s.vendor.isActive && s.vendor.status === 'APPROVED' ? '' : 'text-amber-700'}>
                          {s.vendor.name}
                        </span>
                      ) : (
                        <span className="text-amber-700">No standing vendor</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-sm shrink-0">
                    {s.amount !== null && (
                      <p className="font-medium">{formatCurrency(s.amount, s.currency as Currency)}</p>
                    )}
                    {s.status === 'ACTIVE' && !s.cancelAtPeriodEnd && (
                      <p className="text-xs text-muted-foreground">
                        {s.skipNextCycle ? 'Resumes' : 'Next charge'} {shortDate(s.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {meta.total} subscription{meta.total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => setFilters({ page: meta.page - 1 })}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {meta.page} of {meta.totalPages}</span>
            <Button size="sm" variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => setFilters({ page: meta.page + 1 })}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Filters({
  filters,
  onChange,
}: {
  filters: AdminSubscriptionFilters;
  onChange: (next: Partial<AdminSubscriptionFilters>) => void;
}) {
  const { data: plans } = useAdminPlans(1, 100);
  const { data: vendors } = useVendors(1, 100, '', true);
  const [q, setQ] = useState(filters.q ?? '');

  // Search as the admin types, without a request per keystroke.
  useEffect(() => {
    if ((filters.q ?? '') === q.trim()) return;
    const timer = setTimeout(() => onChange({ q: q.trim() || undefined }), 350);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Subscriber or recipient name, or email"
          className="pl-8 h-9"
          aria-label="Search subscriptions"
        />
      </div>
      <select
        className={selectClass}
        value={filters.status ?? ''}
        onChange={(e) => onChange({ status: (e.target.value as SubscriptionStatus) || undefined })}
        aria-label="Status"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <select
        className={selectClass}
        value={filters.planId ?? ''}
        onChange={(e) => onChange({ planId: e.target.value || undefined })}
        aria-label="Plan"
      >
        <option value="">All plans</option>
        {(plans?.data ?? []).map((p: { id: string; name: string; isActive: boolean }) => (
          <option key={p.id} value={p.id}>{p.name}{p.isActive ? '' : ' (retired)'}</option>
        ))}
      </select>
      <select
        className={selectClass}
        value={filters.vendorId ?? ''}
        onChange={(e) => onChange({ vendorId: e.target.value || undefined })}
        aria-label="Standing vendor"
      >
        <option value="">All vendors</option>
        <option value="none">No standing vendor</option>
        {(vendors?.vendors ?? []).map((v: { id: string; name: string }) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
    </div>
  );
}

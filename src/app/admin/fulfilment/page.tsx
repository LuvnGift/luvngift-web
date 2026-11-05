'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, ClipboardList, ShieldAlert, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useFulfilmentBoard, type FulfilmentBoard, type FulfilmentProblemKind } from '@/hooks/use-admin';
import { shortDate } from '../subscriptions/labels';

const HORIZONS = [7, 14, 31];

const PROBLEM_LABEL: Record<FulfilmentProblemKind, { label: string; paid: boolean }> = {
  AWAITING_VENDOR: { label: 'Paid, no vendor', paid: true },
  BOX_HELD: { label: 'Box held for review', paid: true },
  LINK_UNOPENED: { label: 'Vendor link not opened', paid: true },
  PAST_DUE: { label: 'Payment failing', paid: false },
  BOX_WILL_HOLD: { label: 'Box will be held', paid: false },
  VENDOR_UNAVAILABLE: { label: 'Standing vendor unavailable', paid: false },
  NO_STANDING_VENDOR: { label: 'No standing vendor', paid: false },
};

export default function FulfilmentBoardPage() {
  const [days, setDays] = useState(7);
  const { data, isLoading, isFetching } = useFulfilmentBoard(days);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Fulfilment</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Subscription deliveries coming up, what each vendor has to buy, and everything that needs a
            person. Upcoming deliveries are forecasts: each becomes an order when Stripe collects.
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Look ahead">
          {HORIZONS.map((d) => (
            <Button key={d} size="sm" variant={d === days ? 'default' : 'outline'} onClick={() => setDays(d)}>
              {d} days
            </Button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className={`space-y-6 ${isFetching ? 'opacity-70' : ''}`}>
          <Problems board={data} />
          <VendorLists board={data} />
          <Upcoming board={data} />
        </div>
      )}
    </div>
  );
}

function Problems({ board }: { board: FulfilmentBoard }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> Needs attention ({board.problems.length})
      </h2>
      {board.problems.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">Nothing needs attention.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {board.problems.map((p, i) => {
            const meta = PROBLEM_LABEL[p.kind];
            const href = p.orderId ? `/admin/orders?order=${p.orderId}` : p.subscriptionId ? `/admin/subscriptions/${p.subscriptionId}` : null;
            return (
              <li key={`${p.kind}-${p.orderId ?? p.subscriptionId}-${i}`} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.paid ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {meta.label}
                    </span>
                    {p.reference && <span className="font-mono text-xs">{p.reference}</span>}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{p.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{meta.paid ? 'since' : 'charges'} {shortDate(p.since)}</p>
                  {href && <Link href={href} className="text-sm text-primary hover:underline">Open</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function VendorLists({ board }: { board: FulfilmentBoard }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Shopping lists by vendor
        </h2>
        <Button size="sm" variant="ghost" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Orders each vendor has accepted plus their subscription deliveries in the next {board.days} days — the
        same basis as the weekly vendor email.
      </p>
      {board.vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">Nothing to buy in this window.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {board.vendors.map((g) => (
            <div key={g.vendor?.id ?? 'unassigned'} className={`rounded-lg border p-4 ${g.vendor ? '' : 'border-amber-300 bg-amber-50/50'}`}>
              <p className="font-medium">{g.vendor?.name ?? 'Needs assigning by hand'}</p>
              <p className="text-xs text-muted-foreground mb-2">
                {g.openOrders} open order{g.openOrders === 1 ? '' : 's'} · {g.upcomingCycles} upcoming deliver{g.upcomingCycles === 1 ? 'y' : 'ies'}
              </p>
              {g.shoppingList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing chosen yet.</p>
              ) : (
                <ul className="text-sm space-y-0.5">
                  {g.shoppingList.map((line) => (
                    <li key={line.name} className="flex justify-between gap-3">
                      <span>{line.name}</span>
                      <span className="font-mono">×{line.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Upcoming({ board }: { board: FulfilmentBoard }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold flex items-center gap-2">
        <CalendarClock className="h-4 w-4" /> Charging in the next {board.days} days ({board.upcoming.length})
      </h2>
      {board.upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">No deliveries are due in this window.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {board.upcoming.map((u) => (
            <li key={u.subscriptionId}>
              <Link href={`/admin/subscriptions/${u.subscriptionId}`} className="block p-3 hover:bg-muted/50">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {u.planName} for {u.recipientName} · {u.destination}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From {u.subscriber} ·{' '}
                      {u.vendor ? (
                        <span className={u.vendorAssignable ? '' : 'text-amber-700'}>{u.vendor.name}</span>
                      ) : (
                        <span className="text-amber-700">no standing vendor</span>
                      )}
                    </p>
                    {u.dietaryFlags.length > 0 && (
                      <p className="text-xs text-amber-800 mt-0.5 flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" /> {u.dietaryFlags.join(', ')}
                      </p>
                    )}
                    {u.boxWarning && <p className="text-xs text-red-700 mt-0.5">{u.boxWarning}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>Charged {shortDate(u.billsAt)}</p>
                    <p>Deliver from {shortDate(u.deliveryFrom)}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

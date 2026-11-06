'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CalendarClock, PackageOpen, ShieldAlert, Store, User } from 'lucide-react';
import { formatCurrency, type Currency } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  useAdminSubscription,
  useAdminSubscriptionBox,
  type AdminSubscriptionDetail,
  type AdminSubscriptionAction,
} from '@/hooks/use-admin';
import { EditBoxDialog } from '../../orders/subscription-box-section';
import { StatusPill, NotePill, cadenceLabel, personName, shortDate, orderRef } from '../labels';
import { ActionDialog, actionsFor, ACTION_COPY } from './action-dialog';
import { StandingVendorDialog } from './standing-vendor-dialog';

export default function AdminSubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sub, isLoading, isError } = useAdminSubscription(id);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (isError || !sub) {
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="text-sm text-muted-foreground">This subscription could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BackLink />
      <Header sub={sub} />
      <div className="grid gap-4 lg:grid-cols-2">
        <NextCycleCard sub={sub} />
        <ActionsCard sub={sub} />
        <PeopleCard sub={sub} />
        <VendorCard sub={sub} />
      </div>
      <BoxCard sub={sub} />
      <CyclesCard sub={sub} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/subscriptions" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
      <ArrowLeft className="h-4 w-4" /> All subscriptions
    </Link>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-4 space-y-2">
      <h2 className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Header({ sub }: { sub: AdminSubscriptionDetail }) {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
        {personName(sub.user)} <StatusPill status={sub.status} />
        {sub.startsAt && new Date(sub.startsAt).getTime() > Date.now() && (
          <NotePill>Not started: first charge {shortDate(sub.startsAt)}</NotePill>
        )}
        {sub.skipNextCycle && <NotePill>Skipping next delivery</NotePill>}
        {sub.cancelAtPeriodEnd && <NotePill tone="red">Ends {shortDate(sub.currentPeriodEnd)}</NotePill>}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {sub.plan.name}{sub.plan.isActive ? '' : ' (retired plan)'} · {cadenceLabel(sub.interval)}
        {sub.amount !== null && <> · {formatCurrency(sub.amount, sub.currency as Currency)} per delivery</>}
        {' '}· since {shortDate(sub.createdAt)}
      </p>
    </div>
  );
}

function NextCycleCard({ sub }: { sub: AdminSubscriptionDetail }) {
  const { nextCycle } = sub;
  return (
    <Card title="Next delivery" icon={CalendarClock}>
      {nextCycle.billsAt ? (
        <p className="text-sm">
          Charged <strong>{shortDate(nextCycle.billsAt)}</strong>; delivery can start from{' '}
          <strong>{shortDate(nextCycle.deliveryFrom)}</strong>.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {sub.status === 'CANCELLED'
            ? 'Cancelled: no more deliveries.'
            : sub.status === 'PAUSED'
              ? 'Paused: nothing is charged or delivered until it is resumed.'
              : sub.cancelAtPeriodEnd
                ? `Ending: nothing more is charged after ${shortDate(sub.currentPeriodEnd)}.`
                : `The next delivery is skipped. Charges resume ${shortDate(sub.currentPeriodEnd)}.`}
        </p>
      )}
      {nextCycle.billsAt && nextCycle.boxWarning && (
        <p className="text-sm text-red-700 flex gap-1.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            This box would be held back for review: {nextCycle.boxWarning} Fix the box before the charge.
          </span>
        </p>
      )}
      {nextCycle.billsAt && !nextCycle.standingVendorAssignable && (
        <p className="text-sm text-amber-700">
          {sub.vendor ? `${sub.vendor.name} is not approved and active, so` : 'There is no standing vendor, so'} the
          next delivery will need assigning by hand.
        </p>
      )}
    </Card>
  );
}

function ActionsCard({ sub }: { sub: AdminSubscriptionDetail }) {
  const [action, setAction] = useState<AdminSubscriptionAction | null>(null);
  const actions = actionsFor(sub);
  return (
    <Card title="Act on the subscriber's behalf" icon={User}>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing can be changed on a cancelled subscription.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button key={a} size="sm" variant={a === 'CANCEL' ? 'outline' : 'secondary'} className={a === 'CANCEL' ? 'text-red-700' : ''} onClick={() => setAction(a)}>
                {ACTION_COPY[a].label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Each needs a reason. The subscriber is emailed what changed and why, and it is recorded in the audit log.
          </p>
        </>
      )}
      {action && <ActionDialog sub={sub} action={action} onClose={() => setAction(null)} />}
    </Card>
  );
}

function PeopleCard({ sub }: { sub: AdminSubscriptionDetail }) {
  const { address } = sub;
  return (
    <Card title="Subscriber and recipient" icon={User}>
      <p className="text-sm">
        <strong>{personName(sub.user)}</strong> · <a href={`mailto:${sub.user.email}`} className="text-primary hover:underline">{sub.user.email}</a>
        {sub.user.phone && <> · {sub.user.phone}</>}
      </p>
      <p className="text-sm text-muted-foreground">
        Delivers to <span className="text-foreground">{address.recipientName}</span> ({address.recipientPhone}),{' '}
        {address.street}, {address.city}, {address.state}
      </p>
      {(address.dietaryFlags.length > 0 || address.dietaryNotes) && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Dietary constraints</p>
            {address.dietaryFlags.length > 0 && <p>{address.dietaryFlags.join(', ')}</p>}
            {address.dietaryNotes && <p className="italic">{address.dietaryNotes}</p>}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Substitutions: {sub.substitutionPreference.replace('_', ' ').toLowerCase()}</p>
    </Card>
  );
}

/** Statuses in which a delivery is still with its vendor and could be moved. */
const OPEN_DELIVERY = new Set(['PENDING', 'PROCESSING', 'SHIPPED']);

function VendorCard({ sub }: { sub: AdminSubscriptionDetail }) {
  const [open, setOpen] = useState(false);
  const usable = sub.nextCycle.standingVendorAssignable;
  // Changing the standing vendor moves only FUTURE cycles. A delivery already
  // with the previous vendor stays there, which is easy to miss when the
  // reason for the change is that the previous vendor cannot do the work.
  const withOtherVendor = sub.orders.filter(
    (o) => OPEN_DELIVERY.has(o.status) && o.vendor && o.vendor.id !== sub.vendor?.id,
  );
  return (
    <Card title="Standing vendor" icon={Store}>
      {sub.vendor ? (
        <p className="text-sm">
          <strong>{sub.vendor.name}</strong> · {sub.vendor.phone}
          {!usable && <span className="text-amber-700"> · not approved and active</span>}
        </p>
      ) : (
        <p className="text-sm text-amber-700">None. Each delivery waits for someone to assign it.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Future deliveries go to this vendor automatically, unless the box needs review. Deliveries already assigned
        stay where they are; reassign those from the order.
      </p>
      {withOtherVendor.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {withOtherVendor.length === 1 ? 'A delivery is' : `${withOtherVendor.length} deliveries are`} still with a
            different vendor
          </p>
          <ul className="mt-1 space-y-0.5">
            {withOtherVendor.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders?order=${o.id}`} className="font-mono text-primary hover:underline">
                  {orderRef(o.id)}
                </Link>{' '}
                with {o.vendor!.name} ({o.status.toLowerCase()})
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">
            Reassign from the order if it should move. The previous vendor is told to stop when you do.
          </p>
        </div>
      )}
      {sub.status !== 'CANCELLED' && (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Change standing vendor</Button>
      )}
      {open && <StandingVendorDialog sub={sub} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function BoxCard({ sub }: { sub: AdminSubscriptionDetail }) {
  const { data: box } = useAdminSubscriptionBox(sub.id);
  const [open, setOpen] = useState(false);
  return (
    <Card title={`Box (${sub.items.length} of ${sub.plan.slotCount} slots)`} icon={PackageOpen}>
      {sub.items.length ? (
        <ul className="text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {sub.items.map((i) => (
            <li key={i.id} className={i.customItem.isActive ? '' : 'text-red-700'}>
              {i.customItem.name}{i.quantity > 1 ? ` ×${i.quantity}` : ''}
              {!i.customItem.isActive && ' (no longer stocked)'}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-red-700">No items chosen. Deliveries will be held until the box is filled.</p>
      )}
      {sub.status !== 'CANCELLED' && (
        <Button size="sm" variant="outline" disabled={!box} onClick={() => setOpen(true)}>Edit box</Button>
      )}
      {open && box && <EditBoxDialog box={box} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function CyclesCard({ sub }: { sub: AdminSubscriptionDetail }) {
  return (
    <Card title={`Deliveries (${sub._count.orders})`} icon={CalendarClock}>
      {sub.orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deliveries yet. The first is created when Stripe collects the first payment.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="text-xs text-muted-foreground text-left">
              <tr>
                <th className="py-1.5 font-medium">Order</th>
                <th className="py-1.5 font-medium">Charged</th>
                <th className="py-1.5 font-medium">Status</th>
                <th className="py-1.5 font-medium">Vendor</th>
                <th className="py-1.5 font-medium">Proof</th>
                <th className="py-1.5 font-medium text-right">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sub.orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2">
                    <Link href={`/admin/orders?order=${o.id}`} className="font-mono text-primary hover:underline">{orderRef(o.id)}</Link>
                    {o.isFlagged && <NotePill tone="red">Held</NotePill>}
                  </td>
                  <td className="py-2">{shortDate(o.createdAt)}</td>
                  <td className="py-2">{o.status.charAt(0) + o.status.slice(1).toLowerCase()}</td>
                  <td className="py-2">{o.vendor?.name ?? <span className="text-amber-700">Unassigned</span>}</td>
                  <td className="py-2">{o.deliveryProofAt ? shortDate(o.deliveryProofAt) : '—'}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(o.total, o.currency as Currency)}
                    {o.payment?.refundAmount ? <span className="block text-xs text-red-700">refunded {formatCurrency(o.payment.refundAmount, o.currency as Currency)}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sub._count.orders > sub.orders.length && (
            <p className="text-xs text-muted-foreground mt-2">Showing the latest {sub.orders.length}. Older deliveries are in Orders.</p>
          )}
        </div>
      )}
    </Card>
  );
}

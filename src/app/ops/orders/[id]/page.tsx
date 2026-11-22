'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';
import { StaffPermission, type OpsOrderDetail } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useOpsConfirmRecipient, useOpsOrder, useOpsRatePartner, useOpsResendLink } from '@/hooks/use-ops';
import { NotesPanel, StatusBadge, formatDate, formatDateTime, useOpsCan } from '@/components/ops/ops-ui';

const EVENT_LABELS: Record<string, string> = {
  PARTNER_ASSIGNED: 'Partner assigned',
  ITEMS_SOURCED: 'Items sourced',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  RECIPIENT_CONFIRMED: 'Recipient confirmed',
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[140px_1fr] gap-2 py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

function PartnerLink({ order }: { order: OpsOrderDetail }) {
  const canResend = useOpsCan(StaffPermission.VENDOR_LINK_RESEND);
  const resend = useOpsResendLink();
  if (!order.partner) {
    return (
      <p className="text-sm">
        No partner yet. Find one on <Link href="/ops/coverage" className="underline">Coverage</Link>, then flag this order
        below so head office can assign them.
      </p>
    );
  }
  const open = order.status === 'PROCESSING' || order.status === 'SHIPPED';
  return (
    <div className="space-y-1">
      <Row label="Partner"><Link href={`/ops/partners/${order.partner.id}`} className="underline">{order.partner.name}</Link></Row>
      {order.partnerContact && (
        <Row label="Contact">
          {order.partnerContact.contactName ?? '—'} ·{' '}
          <a href={`tel:${order.partnerContact.phone}`} className="inline-flex items-center gap-1 underline">
            <Phone className="h-3 w-3" />{order.partnerContact.phone}
          </a>
        </Row>
      )}
      <Row label="Order link">
        {order.link
          ? `Sent ${formatDateTime(order.link.issuedAt)} · ${order.link.lastUsedAt ? `last opened ${formatDateTime(order.link.lastUsedAt)}` : 'never opened'}`
          : 'No active link'}
      </Row>
      {canResend && open && (
        <Button size="sm" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate({ orderId: order.id })}>
          Resend link by email and SMS
        </Button>
      )}
    </div>
  );
}

function ConfirmRecipient({ order }: { order: OpsOrderDetail }) {
  const can = useOpsCan(StaffPermission.RECIPIENT_CONFIRM);
  const confirm = useOpsConfirmRecipient();
  const [note, setNote] = useState('');
  if (order.recipientConfirmedAt) {
    return <Row label="Recipient">Confirmed {formatDateTime(order.recipientConfirmedAt)} ({order.recipientConfirmedVia === 'CODE' ? 'SMS code' : 'by phone'})</Row>;
  }
  if (!can || !['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) return null;
  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-sm font-medium">Confirm with the recipient</p>
      <p className="text-muted-foreground text-xs">Only after you have called them and they told you they have the gift.</p>
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called Mrs Ade at 2pm, she has it and it was complete" />
      <Button size="sm" disabled={note.trim().length < 10 || confirm.isPending} onClick={() => confirm.mutate({ orderId: order.id, body: { note: note.trim() } })}>
        Record confirmation
      </Button>
    </div>
  );
}

const SCORES = ['punctuality', 'quality', 'communication', 'packaging'] as const;

function RatePartner({ order }: { order: OpsOrderDetail }) {
  const can = useOpsCan(StaffPermission.PARTNER_RATING);
  const rate = useOpsRatePartner();
  const [scores, setScores] = useState<Record<(typeof SCORES)[number], number>>({ punctuality: 0, quality: 0, communication: 0, packaging: 0 });
  if (!can || order.status !== 'DELIVERED' || !order.partner) return null;
  if (order.ratedPartnerIds.includes(order.partner.id)) return <p className="text-muted-foreground text-sm">Partner rated for this order.</p>;
  const ready = SCORES.every((k) => scores[k] >= 1);
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <h2 className="font-semibold">Rate {order.partner.name}</h2>
        {SCORES.map((k) => (
          <div key={k} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-32 capitalize">{k}</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                aria-label={`${k} ${n}`}
                onClick={() => setScores((s) => ({ ...s, [k]: n }))}
                className={`h-8 w-8 rounded-md border text-sm ${scores[k] === n ? 'bg-primary text-primary-foreground' : ''}`}
              >
                {n}
              </button>
            ))}
          </div>
        ))}
        <Button size="sm" disabled={!ready || rate.isPending} onClick={() => rate.mutate({ orderId: order.id, body: { vendorId: order.partner!.id, ...scores } })}>
          Save rating
        </Button>
      </CardContent>
    </Card>
  );
}

export default function OpsOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError } = useOpsOrder(id);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (isError || !order) return <p className="text-muted-foreground py-16 text-center">Order not found.</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/ops/orders" className="text-muted-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{order.reference}</h1>
        <StatusBadge order={order} />
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 font-semibold">Recipient</h2>
          <Row label="Name">{order.recipientName}</Row>
          <Row label="Phone"><a href={`tel:${order.recipientPhone}`} className="underline">{order.recipientPhone}</a></Row>
          <Row label="Address">{order.deliveryStreet}, {order.deliveryCity}, {order.deliveryState}</Row>
          <Row label="Due by">{formatDate(order.dueBy)}{order.preferredDeliveryDate ? ' (date chosen by the buyer)' : ''}</Row>
          {order.personalMessage && <Row label="Gift message">{order.personalMessage}</Row>}
          {order.specialInstructions && <Row label="Instructions">{order.specialInstructions}</Row>}
          <ConfirmRecipient order={order} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 font-semibold">What is in it</h2>
          <ul className="space-y-1 text-sm">
            {order.items.map((i, n) => (
              <li key={n}>
                {i.quantity} × {i.name}
                {i.substitutedForName && <span className="text-muted-foreground"> (instead of {i.substitutedForName})</span>}
                {i.isOmitted && <span className="text-destructive"> (left out)</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 font-semibold">Partner</h2>
          <PartnerLink order={order} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-2 font-semibold">Timeline</h2>
          <ul className="space-y-1 text-sm">
            <li>Paid · {formatDateTime(order.createdAt)}</li>
            {order.events.map((e, n) => <li key={n}>{EVENT_LABELS[e.kind] ?? e.kind} · {formatDateTime(e.createdAt)}</li>)}
          </ul>
          {order.deliveryProofUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={order.deliveryProofUrl} alt="Delivery photo" className="mt-4 max-h-80 rounded-md border object-contain" />
          )}
          {order.deliveryProofNote && <p className="text-muted-foreground mt-2 text-sm">{order.deliveryProofNote}</p>}
        </CardContent>
      </Card>

      <RatePartner order={order} />
      <NotesPanel targetType="ORDER" targetId={order.id} />
    </div>
  );
}

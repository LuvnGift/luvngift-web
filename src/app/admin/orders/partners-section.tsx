'use client';

/**
 * Who is fulfilling the order, and what they are owed (admin only).
 *
 * One partner per order (2026-11-11): one line of goods + the fulfilment fee
 * for the recipient's state band, snapshotted at checkout. The partner is
 * chosen with Assign Vendor (which issues their link) and takes the line;
 * payouts follow the schedule on their profile and are recorded here when
 * paid. The customer sees the same story as a timeline, never names or amounts.
 */

import { useState } from 'react';
import { CheckCircle2, ExternalLink, Pencil, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { BAND_LABELS } from '@luvngift/shared';
import {
  ROLE_LABELS,
  nairaLabel,
  payoutModeLabel,
  useCancelPayout,
  useConfirmRecipient,
  useMarkPayoutPaid,
  useOrderFulfilment,
  useRatePartner,
  useReviewReceipt,
  useSetPartnerAmount,
  type OrderFulfilment,
  type PartnerLine,
} from '@/hooks/use-partners';

const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-sm';
const heading = 'text-xs text-muted-foreground uppercase tracking-wide font-medium';
const toKobo = (naira: string) => Math.round(Number(naira) * 100);
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const EVENT_LABELS: Record<string, string> = {
  PARTNER_ASSIGNED: 'Partner assigned',
  ITEMS_SOURCED: 'Goods bought',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered (photo)',
  RECIPIENT_CONFIRMED: 'Recipient confirmed',
};

export function PartnersSection({ orderId }: { orderId: string }) {
  const { data, isLoading } = useOrderFulfilment(orderId);
  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> Loading partners…</div>;
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className={heading}>Partner</p>
        <p className="text-xs text-muted-foreground">
          {data.order.deliveryState}: {BAND_LABELS[data.band]} band, fee {nairaLabel(data.bandFeeNgn)} today
        </p>
      </div>
      <AmountEditor data={data} />
      {data.lines.map((line) => <LineRow key={line.id} line={line} />)}
      {data.lines.length > 0 && !data.lines.some((l) => l.vendor) && (
        <p className="text-xs text-muted-foreground">
          Not assigned yet. Use Assign Vendor: it sends the partner their link and gives them this line.
        </p>
      )}
      <Receipts data={data} />
      <Confirmation data={data} />
      <Timeline data={data} />
      {data.order.status === 'DELIVERED' && <Ratings data={data} />}
    </div>
  );
}

/**
 * What the partner is owed (goods + fee). Opens by itself on an order with no
 * line (a custom gift, or a bundle priced before goods were costed).
 */
function AmountEditor({ data }: { data: OrderFulfilment }) {
  const save = useSetPartnerAmount(data.order.id);
  const current = data.lines.find((l) => l.role === 'FULFILMENT');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ? String(current.amountNgn / 100) : '');
  const empty = !current;

  if (!empty && !open) {
    return (
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3 mr-1" /> Edit amount
      </Button>
    );
  }
  const amountNgn = toKobo(value || '0');
  const submit = async () => {
    if (amountNgn <= 0) return;
    await save.mutateAsync(amountNgn);
    setOpen(false);
  };
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-sm">
        {empty
          ? `No partner amount on this order yet (a custom gift, or a bundle priced before its goods were costed). Set what the partner is paid: the goods plus the ${BAND_LABELS[data.band]} band fee (${nairaLabel(data.bandFeeNgn)}).`
          : 'What the partner is paid for this order, goods + fee (₦):'}
      </p>
      <label className="text-xs space-y-1 block max-w-xs">
        <span className="text-muted-foreground">Partner is owed (₦)</span>
        <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={amountNgn <= 0 || save.isPending}>{save.isPending ? <Spinner size="sm" /> : 'Save amount'}</Button>
        {!empty && <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>}
      </div>
    </div>
  );
}

function LineRow({ line }: { line: PartnerLine }) {
  const live = line.payouts.filter((p) => p.status !== 'CANCELLED');
  const fixed = line.vendor?.payTerms === 'FIXED_NAIRA';
  return (
    <div className="rounded-md border p-3 space-y-2 text-sm">
      <div>
        <p className="font-medium">{ROLE_LABELS[line.role]} · {nairaLabel(line.amountNgn)}</p>
        <p className="text-xs text-muted-foreground">
          {line.vendor ? line.vendor.name : 'Unassigned'}
          {line.vendor?.payTerms === 'REVENUE_SHARE' && ' · revenue share (paid as before, not in this ledger)'}
          {fixed && ` · ${payoutModeLabel(line.payoutMode)}${line.payoutMode === 'SPLIT' && line.splitPercent ? ` (${line.splitPercent}% upfront)` : ''}`}
          {fixed && ` · owed ${nairaLabel(line.owedNgn)}`}
        </p>
      </div>
      {live.length > 0 && (
        <ul className="space-y-1.5">
          {live.map((p) => <PayoutRow key={p.id} payout={p} />)}
        </ul>
      )}
    </div>
  );
}

function PayoutRow({ payout }: { payout: PartnerLine['payouts'][number] }) {
  const markPaid = useMarkPayoutPaid();
  const cancel = useCancelPayout();
  const [reference, setReference] = useState('');
  const label = `${payout.kind.charAt(0)}${payout.kind.slice(1).toLowerCase()} ${nairaLabel(payout.amountNgn)}`;
  if (payout.status === 'PAID') {
    return <li className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {label} paid · ref {payout.reference}</li>;
  }
  return (
    <li className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-amber-800">{label} due</span>
      <Input className="h-7 w-40 text-xs" placeholder="Transfer reference" value={reference} onChange={(e) => setReference(e.target.value)} />
      <Button size="sm" className="h-7 text-xs" disabled={reference.trim().length < 3 || markPaid.isPending} onClick={() => markPaid.mutate({ id: payout.id, reference: reference.trim() })}>
        Mark paid
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground"
        disabled={cancel.isPending}
        onClick={() => {
          const reason = prompt('Why is this payout cancelled? (at least 5 characters)');
          if (reason && reason.trim().length >= 5) cancel.mutate({ id: payout.id, reason: reason.trim() });
        }}
      >
        Cancel
      </Button>
    </li>
  );
}

function Receipts({ data }: { data: OrderFulfilment }) {
  const review = useReviewReceipt(data.order.id);
  if (!data.receipts.length) return null;
  return (
    <div className="space-y-1.5">
      <p className={heading}>Receipts</p>
      {data.receipts.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs">
          <a href={r.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {nairaLabel(r.amountNgn)} <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-muted-foreground">{when(r.createdAt)}{r.note ? ` · ${r.note}` : ''}</span>
          {r.status === 'SUBMITTED' ? (
            <>
              <Button size="sm" className="h-7 text-xs" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, approve: true })}>Approve</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, approve: false })}>Reject</Button>
            </>
          ) : (
            <span className={r.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}>{r.status.toLowerCase()}</span>
          )}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Receipts are evidence of what was bought. Reviewing one records the check; it never pays anything.</p>
    </div>
  );
}

function Confirmation({ data }: { data: OrderFulfilment }) {
  const confirm = useConfirmRecipient(data.order.id);
  const [note, setNote] = useState('');
  const { order } = data;
  if (order.recipientConfirmedAt) {
    return (
      <p className="text-sm text-green-700 flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4" /> Recipient confirmed {when(order.recipientConfirmedAt)}
        {order.recipientConfirmedVia === 'ADMIN' ? ' (by admin)' : ' (code)'}
      </p>
    );
  }
  if (!['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-sm">
        Recipient has not confirmed.{' '}
        {data.requireRecipientConfirmation && order.status !== 'DELIVERED' && <span className="text-amber-700">Settings require it before the partner can mark it delivered.</span>}
      </p>
      <div className="flex gap-2">
        <Input className="text-xs" placeholder="How did they confirm? e.g. Called Ada on 0803…, she has it" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" disabled={note.trim().length < 10 || confirm.isPending} onClick={() => confirm.mutate(note.trim())}>
          Confirm on their word
        </Button>
      </div>
    </div>
  );
}

function Timeline({ data }: { data: OrderFulfilment }) {
  if (!data.timeline.length) return null;
  return (
    <div>
      <p className={heading}>Timeline</p>
      <ol className="mt-1.5 space-y-1 text-xs">
        {data.timeline.map((e) => (
          <li key={e.id} className="flex gap-2">
            <span className="text-muted-foreground w-28 shrink-0">{when(e.createdAt)}</span>
            <span>{EVENT_LABELS[e.kind] ?? e.kind}{e.role ? ` · ${ROLE_LABELS[e.role]}` : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** One rating per partner who worked on the delivered order. Re-rating replaces it. */
function Ratings({ data }: { data: OrderFulfilment }) {
  const partners = new Map<string, string>();
  for (const l of data.lines) if (l.vendor) partners.set(l.vendor.id, l.vendor.name);
  if (!partners.size) return null;
  return (
    <div className="space-y-2">
      <p className={heading}>Rate the partner</p>
      {[...partners].map(([id, name]) => (
        <RatingForm key={id} orderId={data.order.id} vendorId={id} name={name} existing={data.ratings.find((r) => r.vendorId === id)} />
      ))}
    </div>
  );
}

function RatingForm({ orderId, vendorId, name, existing }: { orderId: string; vendorId: string; name: string; existing?: OrderFulfilment['ratings'][number] }) {
  const rate = useRatePartner(orderId);
  const [scores, setScores] = useState({
    punctuality: existing?.punctuality ?? 0,
    quality: existing?.quality ?? 0,
    communication: existing?.communication ?? 0,
    // Used the Luvngift packaging as briefed.
    packaging: existing?.packaging ?? 0,
  });
  const ready = Object.values(scores).every((v) => v >= 1);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium w-32 truncate">{name}</span>
      {(Object.keys(scores) as (keyof typeof scores)[]).map((k) => (
        <select key={k} className={`${SELECT} h-7 text-xs`} value={scores[k]} onChange={(e) => setScores({ ...scores, [k]: Number(e.target.value) })} aria-label={k}>
          <option value={0}>{k}</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{k} {n}</option>)}
        </select>
      ))}
      <Button size="sm" className="h-7 text-xs gap-1" disabled={!ready || rate.isPending} onClick={() => rate.mutate({ vendorId, ...scores })}>
        <Star className="h-3 w-3" /> {existing ? 'Update' : 'Rate'}
      </Button>
    </div>
  );
}

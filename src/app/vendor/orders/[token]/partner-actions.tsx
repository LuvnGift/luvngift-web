'use client';

/**
 * The fulfilment-partner parts of the order link: mark the goods bought, the
 * recipient's handover code, purchase receipts, and what this partner is paid.
 * Built for a phone at a doorway, like the rest of the page.
 */

import { useState } from 'react';
import { Banknote, CheckCircle2, KeyRound, Loader2, Receipt, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PartnerPayLine {
  role: 'SOURCING' | 'AGENT' | 'DELIVERY';
  amountNgn: number;
  payoutMode: 'ADVANCE' | 'REIMBURSE' | 'SPLIT' | null;
  payouts: { kind: string; amountNgn: number; status: 'DUE' | 'PAID' }[];
}

export interface PartnerState {
  itemsSourced: boolean;
  canMarkSourced: boolean;
  recipientConfirmed: boolean;
  requireRecipientConfirmation: boolean;
  canConfirmRecipient: boolean;
  yourPay: PartnerPayLine[];
  receipts: { id: string; amountNgn: number; status: 'SUBMITTED' | 'APPROVED' | 'REJECTED'; createdAt: string }[];
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;
const ROLE_LABELS = { SOURCING: 'Buying the goods', AGENT: 'Managing the order', DELIVERY: 'Delivery' };
const KIND_LABELS: Record<string, string> = { ADVANCE: 'Paid in advance', REIMBURSEMENT: 'Reimbursed', BALANCE: 'On delivery' };

function errorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? fallback;
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SourcedButton({ token, state, onDone }: { token: string; state: PartnerState; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (state.itemsSourced) {
    return <p className="mb-4 flex items-center gap-2 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" /> Goods bought</p>;
  }
  if (!state.canMarkSourced) return null;
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/v1/vendor-portal/orders/${token}/sourced`);
      await onDone();
    } catch (err) {
      setError(errorMessage(err, 'Could not update the order. Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-4">
      <Button variant="outline" size="lg" className="h-14 w-full text-base" disabled={busy} onClick={() => void run()}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
        <span className="ml-2">I have bought everything</span>
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

/**
 * At the door: text the recipient a code, they read it out, enter it. The SMS
 * names Luvngift, not the sender, so it does not spoil a surprise.
 */
export function RecipientCode({ token, state, onDone }: { token: string; state: PartnerState; onDone: () => Promise<void> }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.recipientConfirmed) {
    return (
      <p className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        <CheckCircle2 className="h-5 w-5" /> The recipient confirmed receiving it.
      </p>
    );
  }
  if (!state.canConfirmRecipient) return null;

  const call = async (path: string, body?: object) => {
    setBusy(true);
    setError(null);
    try {
      return (await api.post(`/api/v1/vendor-portal/orders/${token}/${path}`, body)).data.data;
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Please try again.'));
      return null;
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    const result = await call('recipient-code');
    if (result) setSentTo(result.sentTo);
  };
  const verify = async () => {
    if (await call('recipient-code/verify', { code })) await onDone();
  };

  return (
    <Card icon={<KeyRound className="h-4 w-4" />} title="Recipient's code">
      <p className="mb-3 text-sm text-muted-foreground">
        At the handover, send the recipient a code by text and ask them to read it to you.
        {state.requireRecipientConfirmation && ' You need it before you can confirm the delivery.'}
      </p>
      <Button variant="outline" size="lg" className="h-12 w-full" disabled={busy} onClick={() => void send()}>
        {busy && !sentTo ? <Loader2 className="h-5 w-5 animate-spin" /> : sentTo ? 'Send a new code' : 'Send code to recipient'}
      </Button>
      {sentTo && <p className="mt-2 text-sm">Sent to the number ending {sentTo}.</p>}
      {sentTo && (
        <div className="mt-3 flex gap-2">
          <Input className="h-12 text-lg tracking-widest" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <Button className="h-12" disabled={busy || code.length !== 6} onClick={() => void verify()}>Confirm</Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground">No text arriving? Contact Luvngift: we can confirm with the recipient by phone.</p>
    </Card>
  );
}

export function Receipts({ token, state, onDone }: { token: string; state: PartnerState; onDone: () => Promise<void> }) {
  const reimbursed = state.yourPay.some((l) => l.role === 'SOURCING' && l.payoutMode === 'REIMBURSE');
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!state.yourPay.some((l) => l.role === 'SOURCING') && !state.receipts.length) return null;

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('receipt', file);
      form.append('amountNaira', amount);
      await api.post(`/api/v1/vendor-portal/orders/${token}/receipts`, form, { timeout: 90_000 });
      setFile(null);
      setAmount('');
      await onDone();
    } catch (err) {
      setError(errorMessage(err, 'The receipt did not upload. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={<Receipt className="h-4 w-4" />} title="Receipts">
      <p className="mb-3 text-sm text-muted-foreground">
        {reimbursed
          ? 'Upload a photo of each receipt. We reimburse the goods once we approve them.'
          : 'Upload a photo of your receipts so we have a record of what was bought.'}
      </p>
      {state.receipts.map((r) => (
        <p key={r.id} className="text-sm">{naira(r.amountNgn)} · {r.status === 'SUBMITTED' ? 'waiting for review' : r.status.toLowerCase()}</p>
      ))}
      <div className="mt-3 space-y-2">
        <Input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Input inputMode="decimal" placeholder="Receipt total in naira" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button className="h-12 w-full" disabled={busy || !file || !(Number(amount) > 0)} onClick={() => void upload()}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Upload receipt'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Card>
  );
}

/** Their own pay on this order, and what has been paid. Never anyone else's. */
export function YourPay({ state }: { state: PartnerState }) {
  if (!state.yourPay.length) return null;
  const total = state.yourPay.reduce((s, l) => s + l.amountNgn, 0);
  return (
    <Card icon={<Banknote className="h-4 w-4" />} title={`Your pay · ${naira(total)}`}>
      <ul className="space-y-2 text-sm">
        {state.yourPay.map((l) => (
          <li key={l.role}>
            <p className="font-medium">{ROLE_LABELS[l.role]}: {naira(l.amountNgn)}</p>
            {l.payouts.map((p, i) => (
              <p key={i} className="text-muted-foreground">
                {KIND_LABELS[p.kind] ?? p.kind} {naira(p.amountNgn)} · {p.status === 'PAID' ? 'paid' : 'due'}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}

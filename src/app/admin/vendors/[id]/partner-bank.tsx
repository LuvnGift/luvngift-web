'use client';

/**
 * Where a partner is paid, and every money event for them (admin only).
 *
 * Changing bank details is the classic payout fraud ("we changed banks, pay
 * here"). New details are never paid until someone confirms the account name
 * (the bank app's name check, or a small test transfer), saving and verifying
 * both need a fresh 2FA code, and when details change the partner is emailed
 * and texted on the contact details we already hold. Old accounts are kept.
 *
 * The usual way in is a one-time link the partner opens to type their own
 * details (sent automatically on approval, or from here after calling the
 * partner back for a change). Typing them in here is the fallback.
 *
 * Field rules come from @luvngift/shared, the schemas the API validates.
 */

import { useState } from 'react';
import { CheckCircle2, ExternalLink, Link2, ShieldAlert } from 'lucide-react';
import {
  BANK_LINK_TTL_DAYS,
  BANK_VERIFICATION_METHODS,
  cancelPartnerBankLinkSchema,
  issuePartnerBankLinkSchema,
  type PartnerBankLinkView,
  partnerAdjustmentSchema,
  partnerBankAccountSchema,
  verifyPartnerBankAccountSchema,
  type BankVerificationMethod,
  type PayoutEventKind,
} from '@luvngift/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  nairaLabel,
  usePartnerBankAccount,
  usePartnerPayoutEvents,
  useSavePartnerBankAccount,
  useVerifyPartnerBankAccount,
  useSendPartnerBankLink,
  useCancelPartnerBankLink,
  useCreateAdjustment,
  usePartnerPayoutSummary,
} from '@/hooks/use-partners';

const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

const METHOD_LABELS: Record<BankVerificationMethod, string> = {
  NAME_CHECK: "Bank app name check (the bank showed the account holder's name)",
  TEST_TRANSFER: 'Test transfer (a small amount sent, and the partner confirmed it arrived)',
};

const EVENT_LABELS: Record<PayoutEventKind, string> = {
  PAYOUT_ACCRUED: 'Payout due',
  PAYOUT_PAID: 'Paid',
  PAYOUT_CANCELLED: 'Payout cancelled',
  BANK_ACCOUNT_ADDED: 'Bank details added',
  BANK_ACCOUNT_VERIFIED: 'Bank details verified',
  BANK_ACCOUNT_SUPERSEDED: 'Bank details replaced',
  PAYOUT_BATCHED: 'Added to a payout batch',
  PAYOUT_RETURNED: 'Due again (transfer not sent)',
  ADJUSTMENT_ADDED: 'Adjustment added',
  ADJUSTMENT_CANCELLED: 'Adjustment cancelled',
  ADJUSTMENT_BATCHED: 'Adjustment added to a batch',
  ADJUSTMENT_PAID: 'Adjustment settled',
  ADJUSTMENT_RETURNED: 'Adjustment due again (transfer not sent)',
  TRANSFER_CREATED: 'Transfer planned',
  TRANSFER_PAID: 'Transfer sent',
  TRANSFER_FAILED: 'Transfer not sent',
  BATCH_EXPORTED: 'Bank file downloaded',
  BANK_LINK_ISSUED: 'Bank-details link sent',
  BANK_LINK_USED: 'Bank-details link used',
  BANK_LINK_CANCELLED: 'Bank-details link withdrawn',
};

const when = (iso: string) => new Date(iso).toLocaleString();

function TotpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="2FA code"
      aria-label="2FA code"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
    />
  );
}

export function BankDetailsCard({ vendorId }: { vendorId: string }) {
  const { data, isLoading } = usePartnerBankAccount(vendorId);
  const [editing, setEditing] = useState(false);
  const current = data?.current ?? null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Bank details</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            {current ? (
              <div className="rounded-md border p-3 space-y-1">
                <p className="font-medium">{current.bankName}</p>
                <p className="font-mono">{current.accountNumber}</p>
                <p>{current.accountName}</p>
                {current.status === 'VERIFIED' ? (
                  <p className="text-xs text-green-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified by {current.verifiedByEmail} on {when(current.verifiedAt!)}: {current.verificationNote}
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 inline-flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Not verified: they cannot be paid until you confirm the account name.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {current.bankLinkId
                    ? `Submitted by the partner through their one-time link on ${when(current.createdAt)}`
                    : `Added by ${current.createdByEmail} on ${when(current.createdAt)}`}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No bank details yet. They cannot be paid until these are added and verified.</p>
            )}

            {current?.status === 'PENDING_VERIFICATION' && <VerifyForm vendorId={vendorId} />}

            <BankLinkSection vendorId={vendorId} link={data?.link ?? null} hasCurrent={!!current} holdUntil={data?.linkHoldUntil ?? null} />

            {editing ? (
              <BankForm vendorId={vendorId} hasCurrent={!!current} onDone={() => setEditing(false)} />
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Enter the details myself instead
              </Button>
            )}

            {!!data?.history.length && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Previous accounts ({data.history.length})</summary>
                <ul className="mt-2 space-y-1">
                  {data.history.map((a) => (
                    <li key={a.id}>
                      {a.bankName} ••••{a.accountLast4} · {a.accountName} · replaced {a.supersededAt ? when(a.supersededAt) : ''}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Where the latest link stands, in words. */
function linkSummary(link: PartnerBankLinkView): string {
  const kind = link.purpose === 'CHANGE' ? 'change' : 'add';
  switch (link.status) {
    case 'SENDING':
      return `Link to ${kind} details created ${when(link.createdAt)} but not delivered yet. If this does not change in a few minutes, send a new one.`;
    case 'OPEN':
      return `Link to ${kind} details sent ${when(link.sentAt!)}, ${link.openedAt ? `opened ${when(link.openedAt)}` : 'not opened yet'}. Expires ${when(link.expiresAt)}.`;
    case 'USED':
      return `Link to ${kind} details used ${when(link.usedAt!)}.`;
    case 'EXPIRED':
      return `Link to ${kind} details expired unused on ${when(link.expiresAt)}.`;
    case 'CANCELLED':
      return `Link to ${kind} details withdrawn ${when(link.cancelledAt!)}${link.cancelReason ? `: ${link.cancelReason}` : ''}.`;
  }
}

/**
 * The partner's one-time link. Sending one needs 2FA: it lets whoever holds it
 * set where money goes (still unpayable until verified). For a CHANGE, only
 * send after calling the partner back on the number on file, never on the
 * strength of a message.
 */
function BankLinkSection({
  vendorId,
  link,
  hasCurrent,
  holdUntil,
}: {
  vendorId: string;
  link: PartnerBankLinkView | null;
  hasCurrent: boolean;
  holdUntil: string | null;
}) {
  const send = useSendPartnerBankLink(vendorId);
  const cancel = useCancelPartnerBankLink(vendorId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const parsed = issuePartnerBankLinkSchema.safeParse({ reason, totpCode });
  const live = link?.status === 'SENDING' || link?.status === 'OPEN';
  const cancelParsed = cancelPartnerBankLinkSchema.safeParse({ reason: 'Withdrawn from the partner profile' });

  const done = () => {
    setOpen(false);
    setReason('');
    setTotpCode('');
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs font-medium inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> Partner's one-time link</p>
      <p className="text-xs text-muted-foreground">
        {link ? linkSummary(link) : 'No link sent yet.'} A link goes to the partner&rsquo;s email and phone on file, works once and lasts {BANK_LINK_TTL_DAYS} days.
      </p>
      {holdUntil && (
        <p className="text-xs text-amber-700">
          This partner&rsquo;s email or phone changed recently, so no link can be sent until {when(holdUntil)}. Their old
          contacts were told, so they have time to object.
        </p>
      )}
      {open && !holdUntil ? (
        <div className="space-y-2">
          {hasCurrent && (
            <p className="text-xs text-amber-700">
              Only send a change link after the partner asked and you called them back on the phone number on file. Never on the
              strength of an email or message alone.
            </p>
          )}
          <Input
            placeholder={hasCurrent ? 'How you confirmed, e.g. called back on the number on file' : 'Why, e.g. the first link expired'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <TotpInput value={totpCode} onChange={setTotpCode} />
          <div className="flex gap-2">
            <Button size="sm" disabled={!parsed.success || send.isPending} onClick={() => parsed.success && send.mutate(parsed.data, { onSuccess: done })}>
              {live ? 'Send a new link (cancels the current one)' : 'Send link'}
            </Button>
            <Button size="sm" variant="ghost" onClick={done}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!holdUntil && (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              {hasCurrent ? 'Send a link to change details' : 'Send a link to add details'}
            </Button>
          )}
          {live && (
            <Button
              size="sm"
              variant="ghost"
              disabled={cancel.isPending || !cancelParsed.success}
              onClick={() => cancelParsed.success && cancel.mutate(cancelParsed.data)}
            >
              Withdraw link
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function BankForm({ vendorId, hasCurrent, onDone }: { vendorId: string; hasCurrent: boolean; onDone: () => void }) {
  const save = useSavePartnerBankAccount(vendorId);
  const [form, setForm] = useState({ bankName: '', accountNumber: '', accountName: '', totpCode: '' });
  const parsed = partnerBankAccountSchema.safeParse(form);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const firstError = parsed.success ? null : parsed.error.issues[0]?.message;

  return (
    <div className="space-y-2 rounded-md border p-3">
      {hasCurrent && (
        <p className="text-xs text-amber-700">
          Only change these if the partner asked, through a contact you already trust. The partner will be emailed and texted
          about the change, and the new account cannot be paid until verified.
        </p>
      )}
      <Input placeholder="Bank name" value={form.bankName} onChange={set('bankName')} />
      <Input placeholder="Account number (10 digits)" inputMode="numeric" maxLength={10} value={form.accountNumber} onChange={set('accountNumber')} />
      <Input placeholder="Account name, exactly as the bank shows it" value={form.accountName} onChange={set('accountName')} />
      <TotpInput value={form.totpCode} onChange={(v) => setForm({ ...form, totpCode: v })} />
      {form.accountNumber && form.totpCode.length === 6 && firstError && <p className="text-xs text-destructive">{firstError}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={!parsed.success || save.isPending} onClick={() => parsed.success && save.mutate(parsed.data, { onSuccess: onDone })}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function VerifyForm({ vendorId }: { vendorId: string }) {
  const verify = useVerifyPartnerBankAccount(vendorId);
  const [method, setMethod] = useState<BankVerificationMethod>('NAME_CHECK');
  const [note, setNote] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const parsed = verifyPartnerBankAccountSchema.safeParse({ method, note, totpCode });

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <p className="text-xs font-medium">Verify these details</p>
      <select className={`${SELECT} w-full`} value={method} onChange={(e) => setMethod(e.target.value as BankVerificationMethod)} aria-label="How you checked">
        {BANK_VERIFICATION_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
      </select>
      <Input placeholder="What you saw, e.g. the name the bank app showed" value={note} onChange={(e) => setNote(e.target.value)} />
      <TotpInput value={totpCode} onChange={setTotpCode} />
      <Button size="sm" disabled={!parsed.success || verify.isPending} onClick={() => parsed.success && verify.mutate(parsed.data)}>
        Mark verified
      </Button>
    </div>
  );
}

export function PaymentHistoryCard({ vendorId }: { vendorId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePartnerPayoutEvents(vendorId, page);
  const { data: summary } = usePartnerPayoutSummary(vendorId);
  const signed = (kobo: number) => `${kobo < 0 ? '−' : ''}${nairaLabel(Math.abs(kobo))}`;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {summary && (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Due now', nairaLabel(summary.dueNgn)],
              ['In a batch', nairaLabel(summary.batchedNgn)],
              ['Open adjustments', signed(summary.adjustmentsNetNgn)],
              ['Paid this month', signed(summary.paidThisMonthNgn)],
              ['Paid all time', signed(summary.paidAllTimeNgn)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border p-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-xs text-muted-foreground">
          Every payout and bank-detail change for this partner, recorded as it happened. Entries cannot be edited or deleted.
          {summary?.lastPaidAt && ` Last paid ${new Date(summary.lastPaidAt).toLocaleDateString()}.`}
        </p>
        {isLoading ? (
          <Spinner />
        ) : !data?.data.length ? (
          <p className="text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="divide-y">
            {data.data.map((e) => (
              <li key={e.id} className="py-2 space-y-0.5">
                <p>
                  <span className="font-medium">{EVENT_LABELS[e.kind]}</span>
                  {e.amountNgn !== null && <> · {e.amountNgn < 0 ? '−' : ''}{nairaLabel(Math.abs(e.amountNgn))}</>}
                  {e.orderId && <span className="font-mono text-xs"> · #{e.orderId.slice(-8).toUpperCase()}</span>}
                  {e.reference && <> · ref {e.reference}</>}
                </p>
                {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {when(e.createdAt)} · {e.actorEmail ?? 'automatic'}
                  {e.proofUrl && (
                    <>
                      {' · '}
                      <a href={e.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        receipt <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {data.meta.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Older</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * A correction to what this partner is owed, netted off in the next batch.
 * The reason is shown to the partner on their statement.
 */
export function AdjustmentCard({ vendorId }: { vendorId: string }) {
  const create = useCreateAdjustment(vendorId);
  const [direction, setDirection] = useState<'owe-them' | 'they-owe'>('they-owe');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const kobo = Math.round(Number(amount) * 100);
  const parsed = partnerAdjustmentSchema.safeParse({
    amountNgn: Number.isFinite(kobo) ? (direction === 'they-owe' ? -kobo : kobo) : NaN,
    reason,
    totpCode,
  });
  const firstError = parsed.success ? null : parsed.error.issues[0]?.message;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Adjust what they are owed</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">Netted off in their next payout batch. The reason appears on their statement.</p>
        <select className={`${SELECT} w-full`} value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} aria-label="Direction">
          <option value="they-owe">They owe us (we overpaid, or an order was paid and then cancelled)</option>
          <option value="owe-them">We owe them more (we underpaid)</option>
        </select>
        <Input placeholder="Amount in naira, e.g. 5000" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder="Reason, in words the partner will understand" value={reason} onChange={(e) => setReason(e.target.value)} />
        <TotpInput value={totpCode} onChange={setTotpCode} />
        {amount && reason && totpCode.length === 6 && firstError && <p className="text-xs text-destructive">{firstError}</p>}
        <Button
          size="sm"
          disabled={!parsed.success || create.isPending}
          onClick={() =>
            parsed.success &&
            create.mutate(parsed.data, {
              onSuccess: () => {
                setAmount('');
                setReason('');
                setTotpCode('');
              },
            })
          }
        >
          Add adjustment
        </Button>
      </CardContent>
    </Card>
  );
}

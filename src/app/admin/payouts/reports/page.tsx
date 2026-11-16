'use client';

/**
 * The month's partner payments, how the naira account was funded, and the
 * month checked against the bank statement. Months are Lagos months, like the
 * statement. Funding records are voided, never edited; a month can be
 * reconciled again, and the newest reconciliation is the current one.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  FUNDING_SOURCE_CURRENCIES,
  formatMoney,
  fundingRate,
  lagosMonthOf,
  payoutFundingSchema,
  payoutReconciliationSchema,
  type FundingSourceCurrency,
} from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  nairaLabel,
  useAddFunding,
  useDownloadMonthCsv,
  useMonthReport,
  usePayoutFundings,
  useReconcileMonth,
  useVoidFunding,
} from '@/hooks/use-partners';
import { PayoutsNav } from '../payouts-nav';

const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-sm';
const signed = (kobo: number) => `${kobo < 0 ? '−' : kobo > 0 ? '+' : ''}${nairaLabel(Math.abs(kobo))}`;
const toMinor = (v: string) => Math.round(Number(v.replace(/,/g, '')) * 100);

export default function PayoutReportsPage() {
  const thisMonth = lagosMonthOf(new Date());
  const [month, setMonth] = useState(thisMonth);
  const { data, isLoading } = useMonthReport(month);
  const download = useDownloadMonthCsv();
  const latest = data?.reconciliations[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner payouts</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          What left the naira account each month, how it was funded, and the month checked against the bank statement. Months
          are in Lagos time, like the statement.
        </p>
      </div>
      <PayoutsNav />

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-sm font-medium">Month</span>
          <Input type="month" value={month} max={thisMonth} onChange={(e) => setMonth(e.target.value)} className="w-44" />
        </label>
        <Button variant="outline" disabled={!data?.payments.length || download.isPending} onClick={() => download.mutate({ month })}>
          Download payments (CSV)
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Paid to partners', nairaLabel(data.paidNgn)],
              ['Naira funded', nairaLabel(data.fundedNgn)],
              ['Reconciled', latest ? (latest.differenceNgn === 0 ? 'Matches the bank' : `Off by ${signed(latest.differenceNgn)}`) : 'Not yet'],
              ['Owed now (all months)', nairaLabel(data.outstanding.dueNgn + data.outstanding.batchedNgn)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={`text-lg font-semibold ${label === 'Reconciled' && latest && latest.differenceNgn !== 0 ? 'text-amber-700' : ''}`}>{value}</dd>
              </div>
            ))}
          </dl>

          <section className="space-y-2">
            <h2 className="font-semibold">Payments ({data.payments.length})</h2>
            {!data.payments.length ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Nothing was paid this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
                    <tr>{['Paid', 'Partner', 'To', 'Bank ref', 'Our ref', 'Amount'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2 text-xs">{new Date(p.paidAt).toLocaleString()}</td>
                        <td className="px-3 py-2"><Link href={`/admin/vendors/${p.vendorId}`} className="hover:underline">{p.vendorName}</Link></td>
                        <td className="px-3 py-2 text-xs">{p.bankName ? `${p.bankName} ••••${p.accountLast4}` : '—'}</td>
                        <td className="px-3 py-2 text-xs">{p.reference}</td>
                        <td className="px-3 py-2 font-mono text-xs">{p.ref}{p.kind === 'PAYOUT' && <span className="text-muted-foreground"> (single)</span>}</td>
                        <td className="px-3 py-2 font-medium">{nairaLabel(p.amountNgn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.byPartner.length > 1 && (
              <p className="text-xs text-muted-foreground">
                By partner: {data.byPartner.map((p) => `${p.vendorName} ${nairaLabel(p.paidNgn)} (${p.count})`).join(' · ')}
              </p>
            )}
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <ReconcileCard month={month} recordedNgn={data.paidNgn} isOpen={month === thisMonth} reconciliations={data.reconciliations} />
            <Card>
              <CardHeader><CardTitle className="text-base">Funding this month</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {!data.funding.length ? (
                  <p className="text-muted-foreground">No funding recorded for this month.</p>
                ) : (
                  data.funding.map((f) => (
                    <p key={f.currency}>
                      {formatMoney(f.sourceAmount, f.currency)} → {nairaLabel(f.amountNgn)} · average ₦{f.rate.toFixed(2)} per {f.currency}
                    </p>
                  ))
                )}
                <p className="text-xs text-muted-foreground">
                  Still owed across all months: due {nairaLabel(data.outstanding.dueNgn)}, in batches {nairaLabel(data.outstanding.batchedNgn)},
                  open adjustments {signed(data.outstanding.adjustmentsNetNgn)}.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <FundingCard />
    </div>
  );
}

function ReconcileCard({
  month,
  recordedNgn,
  isOpen,
  reconciliations,
}: {
  month: string;
  recordedNgn: number;
  isOpen: boolean;
  reconciliations: { id: string; bankOutflowNgn: number; recordedPaidNgn: number; differenceNgn: number; note: string | null; reconciledByEmail: string; createdAt: string }[];
}) {
  const reconcile = useReconcileMonth();
  const [bank, setBank] = useState('');
  const [note, setNote] = useState('');
  const parsed = payoutReconciliationSchema.safeParse({ month, bankOutflowNgn: bank ? toMinor(bank) : NaN, note: note || undefined });
  const diff = parsed.success ? parsed.data.bankOutflowNgn - recordedNgn : null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Check against the bank statement</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">
          Enter the total that left the naira account for partner payments in {month}, from the bank statement. Recorded here:{' '}
          <strong>{nairaLabel(recordedNgn)}</strong>.{isOpen && ' This month is still open: reconcile it once it has ended.'}
        </p>
        <Input placeholder="Bank statement total, in naira" inputMode="decimal" value={bank} onChange={(e) => setBank(e.target.value)} />
        <Input placeholder="Note (e.g. what explains a difference)" value={note} onChange={(e) => setNote(e.target.value)} />
        {diff !== null && (
          <p className={`text-xs ${diff === 0 ? 'text-green-700' : 'text-amber-700'}`}>
            {diff === 0
              ? 'Matches.'
              : diff > 0
                ? `${nairaLabel(diff)} more left the bank than was recorded: a payment not recorded here, or a bank charge.`
                : `${nairaLabel(-diff)} less left the bank than was recorded: a payment recorded here that was not sent.`}
          </p>
        )}
        <Button size="sm" disabled={!parsed.success || reconcile.isPending} onClick={() => parsed.success && reconcile.mutate(parsed.data, { onSuccess: () => { setBank(''); setNote(''); } })}>
          Save reconciliation
        </Button>
        {reconciliations.length > 0 && (
          <ul className="space-y-1 pt-2 text-xs">
            {reconciliations.map((r, i) => (
              <li key={r.id} className={i === 0 ? '' : 'text-muted-foreground'}>
                {new Date(r.createdAt).toLocaleString()} · {r.reconciledByEmail}: bank {nairaLabel(r.bankOutflowNgn)}, recorded {nairaLabel(r.recordedPaidNgn)},{' '}
                {r.differenceNgn === 0 ? 'matched' : `off by ${signed(r.differenceNgn)}`}
                {r.note ? ` · ${r.note}` : ''}
                {i === 0 && reconciliations.length > 1 ? ' (current)' : ''}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FundingCard() {
  const [page, setPage] = useState(1);
  const { data } = usePayoutFundings(page);
  const add = useAddFunding();
  const voidIt = useVoidFunding();
  const [form, setForm] = useState({ fundedOn: new Date().toISOString().slice(0, 10), sent: '', received: '', currency: 'CAD' as FundingSourceCurrency, provider: '', reference: '' });
  const parsed = payoutFundingSchema.safeParse({
    fundedOn: form.fundedOn,
    sourceAmount: form.sent ? toMinor(form.sent) : NaN,
    amountNgn: form.received ? toMinor(form.received) : NaN,
    sourceCurrency: form.currency,
    provider: form.provider,
    reference: form.reference || undefined,
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Funding the naira account</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Each time money is moved from abroad into the naira account, record what was sent and what arrived. The rate is what
          you actually received, and order margins are estimated with the latest CAD rate.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input type="date" value={form.fundedOn} onChange={set('fundedOn')} aria-label="Date the naira arrived" />
          <div className="flex gap-1">
            <select className={SELECT} value={form.currency} onChange={set('currency')} aria-label="Currency sent">
              {FUNDING_SOURCE_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <Input placeholder="Amount sent" inputMode="decimal" value={form.sent} onChange={set('sent')} />
          </div>
          <Input placeholder="Naira received" inputMode="decimal" value={form.received} onChange={set('received')} />
          <Input placeholder="Bank or FX provider" value={form.provider} onChange={set('provider')} />
          <Input placeholder="Reference (optional)" value={form.reference} onChange={set('reference')} />
          <Button
            disabled={!parsed.success || add.isPending}
            onClick={() => parsed.success && add.mutate(parsed.data, { onSuccess: () => setForm({ ...form, sent: '', received: '', reference: '' }) })}
          >
            Record funding
          </Button>
        </div>
        {parsed.success && (
          <p className="text-xs text-muted-foreground">Rate: ₦{fundingRate(parsed.data.amountNgn, parsed.data.sourceAmount).toFixed(2)} per {form.currency}</p>
        )}

        {!!data?.data.length && (
          <ul className="divide-y text-xs">
            {data.data.map((f) => (
              <li key={f.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${f.voidedAt ? 'text-muted-foreground line-through' : ''}`}>
                <span>
                  {f.fundedOn} · {formatMoney(f.sourceAmount, f.sourceCurrency)} → {nairaLabel(f.amountNgn)} at ₦{f.rate.toFixed(2)} · {f.provider}
                  {f.reference ? ` · ${f.reference}` : ''} · {f.createdByEmail}
                </span>
                {f.voidedAt ? (
                  <span className="no-underline">Voided: {f.voidedReason}</span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    disabled={voidIt.isPending}
                    onClick={() => {
                      const reason = window.prompt('Why is this record wrong? (at least 5 characters)');
                      if (reason && reason.trim().length >= 5) voidIt.mutate({ id: f.id, reason: reason.trim() });
                    }}
                  >
                    Void
                  </Button>
                )}
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

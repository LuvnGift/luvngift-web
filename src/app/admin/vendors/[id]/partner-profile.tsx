'use client';

/**
 * A partner's vetting, the states they cover, how they are paid and their
 * score (admin only).
 *
 * Every partner is an established hamper or gift business (2026-11-11).
 * Approval is refused by the API until the address check, the interview and
 * a sample hamper have PASSED; the CAC check is recorded when they have one.
 * How they are paid is set per partner here: everything on delivery, or a
 * percent upfront and the rest on delivery.
 */

import { useState } from 'react';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { NIGERIAN_STATES, PAYOUT_MODES } from '@luvngift/shared';
import {
  PAYOUT_MODE_LABELS,
  usePartnerProfile,
  useSetCoverage,
  useSetPayTerms,
  useSetVettingCheck,
  type PartnerProfile,
  type PayTerms,
  type PayoutMode,
} from '@/hooks/use-partners';
import { AdjustmentCard, BankDetailsCard, PaymentHistoryCard } from './partner-bank';

const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

export function PartnerProfilePanel({ vendorId }: { vendorId: string }) {
  const { data, isLoading } = usePartnerProfile(vendorId);
  if (isLoading) return <div className="flex h-24 items-center justify-center"><Spinner /></div>;
  if (!data) return null;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <VettingCard profile={data} />
      <div className="space-y-6">
        <ScoreCard profile={data} />
        <PayTermsCard profile={data} />
        <BankDetailsCard vendorId={data.id} />
        <AdjustmentCard vendorId={data.id} />
      </div>
      <CoverageCard profile={data} />
      <BusinessCard profile={data} />
      <div className="md:col-span-2"><PaymentHistoryCard vendorId={data.id} /></div>
    </div>
  );
}

function ScoreCard({ profile }: { profile: PartnerProfile }) {
  const s = profile.score;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Score</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-1">
        {s?.score == null ? (
          <p className="text-muted-foreground">Not scored yet: no ratings or delivered orders.</p>
        ) : (
          <>
            <p className="text-3xl font-bold">{s.score}<span className="text-base text-muted-foreground"> / 100</span></p>
            <p className="text-muted-foreground">
              Rating {s.averageRating ?? '—'} / 5 ({s.ratingCount}) · on time {s.onTimeRate ?? '—'}% · recipient confirmed {s.confirmationRate ?? '—'}%
            </p>
            <p className="text-xs text-muted-foreground">The rating averages punctuality, quality, communication and use of the Luvngift packaging.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VettingCard({ profile }: { profile: PartnerProfile }) {
  const setCheck = useSetVettingCheck(profile.id);
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vetting</CardTitle>
        <p className="text-xs text-muted-foreground">
          {profile.missingChecks.length
            ? `Approval needs: ${profile.missingChecks.join(', ')}.`
            : 'Every required check has passed.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {profile.vetting.map((c) => (
          <div key={c.kind} className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                {c.status === 'PASSED' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {c.status === 'FAILED' && <XCircle className="h-4 w-4 text-red-600" />}
                {c.label}
                <span className="text-xs font-normal text-muted-foreground">{c.required ? '· required' : '· optional'}</span>
              </span>
              <div className="flex gap-1">
                {(['PASSED', 'FAILED'] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={c.status === status ? 'default' : 'outline'}
                    className="h-7 text-xs"
                    disabled={setCheck.isPending}
                    onClick={() => setCheck.mutate({ kind: c.kind, status, note: notes[c.kind] || undefined })}
                  >
                    {status === 'PASSED' ? 'Pass' : 'Fail'}
                  </Button>
                ))}
              </div>
            </div>
            {c.note && <p className="text-xs text-muted-foreground">{c.note}{c.checkedAt ? ` · ${new Date(c.checkedAt).toLocaleDateString()}` : ''}</p>}
            <Input className="h-7 text-xs" placeholder="Note (what you checked)" value={notes[c.kind] ?? ''} onChange={(e) => setNotes({ ...notes, [c.kind]: e.target.value })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BusinessCard({ profile }: { profile: PartnerProfile }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Business details</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><span className="text-muted-foreground">CAC number:</span> {profile.cacNumber ?? 'Not given'}</p>
        <p>
          <span className="text-muted-foreground">Their work:</span>{' '}
          {profile.portfolioUrl ? (
            <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-primary hover:underline">
              {profile.portfolioUrl} <ExternalLink className="h-3 w-3" />
            </a>
          ) : 'Not given'}
        </p>
      </CardContent>
    </Card>
  );
}

/** The states they deliver to. A partner is suggested for an order only in a state they cover. */
function CoverageCard({ profile }: { profile: PartnerProfile }) {
  const save = useSetCoverage(profile.id);
  const [states, setStates] = useState<string[]>(profile.coverage.map((c) => c.state));
  const [adding, setAdding] = useState<string>(NIGERIAN_STATES[0]);
  const sorted = [...states].sort();
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">States they cover</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">Covers nowhere yet, so they are never suggested.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sorted.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs">
                {s}
                <button type="button" className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${s}`} onClick={() => setStates(states.filter((x) => x !== s))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <select className={SELECT} value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="State">
            {NIGERIAN_STATES.filter((s) => !states.includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => adding && !states.includes(adding) && setStates([...states, adding])}>
            Add state
          </Button>
          <Button size="sm" onClick={() => save.mutate(states)} disabled={save.isPending}>Save coverage</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** A retired schedule on an old profile reads as on delivery, as the API pays it. */
const scheduleOf = (mode: string): PayoutMode => (mode === 'SPLIT' ? 'SPLIT' : 'ON_DELIVERY');

function PayTermsCard({ profile }: { profile: PartnerProfile }) {
  const save = useSetPayTerms(profile.id);
  const [payTerms, setPayTerms] = useState<PayTerms>(profile.payTerms);
  const [mode, setMode] = useState<PayoutMode>(scheduleOf(profile.payoutMode));
  const [split, setSplit] = useState(String(profile.splitPercent ?? ''));
  const movingToFixed = profile.payTerms === 'REVENUE_SHARE' && payTerms === 'FIXED_NAIRA';
  const splitValid = mode !== 'SPLIT' || (Number(split) >= 1 && Number(split) <= 100);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">How they are paid</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <select className={`${SELECT} w-full`} value={payTerms} onChange={(e) => setPayTerms(e.target.value as PayTerms)} aria-label="Pay terms">
          <option value="FIXED_NAIRA">Fixed naira per order (goods + fee, stated on each order)</option>
          <option value="REVENUE_SHARE">Revenue share (legacy, paid outside this ledger)</option>
        </select>
        <fieldset className="space-y-1.5" disabled={payTerms !== 'FIXED_NAIRA'}>
          {PAYOUT_MODES.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={`payout-${profile.id}`} className="h-4 w-4" checked={mode === m} onChange={() => setMode(m)} />
              {PAYOUT_MODE_LABELS[m]}
            </label>
          ))}
        </fieldset>
        {mode === 'SPLIT' && payTerms === 'FIXED_NAIRA' && (
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Percent paid when they are assigned an order</span>
            <Input placeholder="e.g. 50" inputMode="numeric" value={split} onChange={(e) => setSplit(e.target.value)} />
          </label>
        )}
        {movingToFixed && (
          <p className="text-xs text-amber-700">
            This changes their contract. Only switch once they have had the notice the Vendor Agreement requires.
          </p>
        )}
        <p className="text-xs text-muted-foreground">Applies to orders assigned from now on; orders already assigned keep their schedule.</p>
        <Button
          size="sm"
          disabled={save.isPending || !splitValid}
          onClick={() => save.mutate({ payTerms, payoutMode: mode, splitPercent: mode === 'SPLIT' ? Number(split) : null })}
        >
          Save pay terms
        </Button>
      </CardContent>
    </Card>
  );
}

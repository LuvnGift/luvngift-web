'use client';

/**
 * A partner's vetting, coverage, pay terms and score (admin only).
 *
 * Approval is refused by the API until every check the partner's type needs
 * has PASSED (agents: all six). The ID document is private: "View ID" fetches
 * a five-minute signed link, and every view is written to the audit log.
 */

import { useState } from 'react';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { NIGERIAN_STATES } from '@luvngift/shared';
import {
  PAYOUT_MODE_LABELS,
  ROLES,
  ROLE_LABELS,
  useDocumentLink,
  usePartnerProfile,
  useSetCoverage,
  useSetPayTerms,
  useSetVettingCheck,
  type FulfilmentRole,
  type PartnerProfile,
  type PayTerms,
  type PayoutMode,
} from '@/hooks/use-partners';

const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-sm';
const ID_TYPES: Record<string, string> = { NIN: 'NIN', PASSPORT: 'Passport', DRIVERS_LICENCE: "Driver's licence", VOTERS_CARD: "Voter's card" };

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
      </div>
      <CoverageCard profile={data} />
      <BackgroundCard profile={data} />
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

function BackgroundCard({ profile }: { profile: PartnerProfile }) {
  const link = useDocumentLink(profile.id);
  const open = async (documentId: string) => {
    const { url } = await link.mutateAsync(documentId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">ID, guarantor and references</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          {profile.idType ? `${ID_TYPES[profile.idType] ?? profile.idType} ending ${profile.idNumberLast4 ?? '—'}` : 'No ID details given.'}
        </p>
        {profile.documents.map((d) => (
          <Button key={d.id} variant="outline" size="sm" className="gap-1" disabled={link.isPending} onClick={() => open(d.id)}>
            View ID ({d.format.toUpperCase()}) <ExternalLink className="h-3 w-3" />
          </Button>
        ))}
        {profile.documents.length > 0 && <p className="text-xs text-muted-foreground">Opens a link that expires in 5 minutes. Each view is audited.</p>}
        {profile.guarantorName && (
          <p><span className="text-muted-foreground">Guarantor:</span> {profile.guarantorName} ({profile.guarantorRelationship}) · {profile.guarantorPhone}</p>
        )}
        {profile.references.map((r) => (
          <p key={r.id}><span className="text-muted-foreground">Reference:</span> {r.name} ({r.relationship}) · {r.phone}</p>
        ))}
        {profile.transport && <p><span className="text-muted-foreground">Transport:</span> {profile.transport}</p>}
      </CardContent>
    </Card>
  );
}

/** States × roles. A partner appears in the assign dialog only where covered. */
function CoverageCard({ profile }: { profile: PartnerProfile }) {
  const save = useSetCoverage(profile.id);
  const [entries, setEntries] = useState(profile.coverage.map(({ state, role }) => ({ state, role })));
  const [state, setState] = useState<string>(NIGERIAN_STATES[0]);
  const states = [...new Set(entries.map((e) => e.state))].sort();
  const has = (s: string, r: FulfilmentRole) => entries.some((e) => e.state === s && e.role === r);
  const toggle = (s: string, r: FulfilmentRole) =>
    setEntries(has(s, r) ? entries.filter((e) => !(e.state === s && e.role === r)) : [...entries, { state: s, role: r }]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Coverage</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {states.length === 0 && <p className="text-muted-foreground">Covers nowhere yet, so they are never suggested.</p>}
        {states.map((s) => (
          <div key={s} className="flex flex-wrap items-center gap-3">
            <span className="w-28 font-medium">{s}</span>
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" className="h-4 w-4" checked={has(s, r)} onChange={() => toggle(s, r)} /> {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        ))}
        <div className="flex gap-2">
          <select className={SELECT} value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
            {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => !states.includes(state) && setEntries([...entries, ...ROLES.map((role) => ({ state, role }))])}>
            Add state
          </Button>
          <Button size="sm" onClick={() => save.mutate(entries)} disabled={save.isPending}>Save coverage</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PayTermsCard({ profile }: { profile: PartnerProfile }) {
  const save = useSetPayTerms(profile.id);
  const [payTerms, setPayTerms] = useState<PayTerms>(profile.payTerms);
  const [mode, setMode] = useState<PayoutMode>(profile.payoutMode);
  const [split, setSplit] = useState(String(profile.splitPercent ?? ''));
  const movingToFixed = profile.payTerms === 'REVENUE_SHARE' && payTerms === 'FIXED_NAIRA';
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">How they are paid</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <select className={`${SELECT} w-full`} value={payTerms} onChange={(e) => setPayTerms(e.target.value as PayTerms)} aria-label="Pay terms">
          <option value="FIXED_NAIRA">Fixed naira per role (stated on each order)</option>
          <option value="REVENUE_SHARE">Revenue share (legacy, paid outside this ledger)</option>
        </select>
        <select className={`${SELECT} w-full`} value={mode} onChange={(e) => setMode(e.target.value as PayoutMode)} aria-label="Payout schedule" disabled={payTerms !== 'FIXED_NAIRA'}>
          {(Object.keys(PAYOUT_MODE_LABELS) as PayoutMode[]).map((m) => <option key={m} value={m}>{PAYOUT_MODE_LABELS[m]}</option>)}
        </select>
        {mode === 'SPLIT' && payTerms === 'FIXED_NAIRA' && (
          <Input placeholder="% paid on assignment" inputMode="numeric" value={split} onChange={(e) => setSplit(e.target.value)} />
        )}
        {movingToFixed && (
          <p className="text-xs text-amber-700">
            This changes their contract. Only switch once they have had the notice the Vendor Agreement requires.
          </p>
        )}
        <Button
          size="sm"
          disabled={save.isPending || (mode === 'SPLIT' && !split)}
          onClick={() => save.mutate({ payTerms, payoutMode: mode, splitPercent: mode === 'SPLIT' ? Number(split) : null })}
        >
          Save pay terms
        </Button>
      </CardContent>
    </Card>
  );
}

'use client';

/**
 * Settings → Fulfilment: the fulfilment fee per state band (High / Medium /
 * Low), which state is in which band, the defaults a new cost stack starts
 * from, the FX buffer every cost-stack price carries, the default split, and
 * whether the recipient's code is required before an order counts as delivered.
 *
 * Every published price is built on the HIGH fee, so it covers any state; an
 * order pays its partner the fee for the recipient's band. A state left
 * unplaced counts as High. Bounds come from `fulfilmentRulesSchema` in
 * @luvngift/shared, which the API validates with.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useFulfilmentRules, useSetFulfilmentRules, type FulfilmentRules } from '@/hooks/use-partners';
import {
  BAND_LABELS,
  DEFAULT_BAND,
  FULFILMENT_BANDS,
  NIGERIAN_STATES,
  bandFeeProblem,
  fulfilmentRulesSchema,
  unplacedStates,
  type FulfilmentBand,
} from '@luvngift/shared';

type StateBands = FulfilmentRules['stateBands'];
const SELECT = 'h-8 w-full rounded-md border border-input bg-background px-2 text-xs';

function StateBandGrid({ value, onChange }: { value: StateBands; onChange: (next: StateBands) => void }) {
  const unplaced = unplacedStates(value);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>Which band each state is in</Label>
        <p className="text-xs text-muted-foreground">
          {unplaced.length ? `${unplaced.length} not placed yet: they count as ${BAND_LABELS[DEFAULT_BAND]}.` : 'Every state is placed.'}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-2">
        {NIGERIAN_STATES.map((state) => (
          <label key={state} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate">{state}</span>
            <select
              className={SELECT}
              aria-label={`${state} band`}
              value={value[state] ?? ''}
              onChange={(e) => {
                const next = { ...value };
                if (e.target.value) next[state] = e.target.value as FulfilmentBand;
                else delete next[state];
                onChange(next);
              }}
            >
              <option value="">Not placed ({BAND_LABELS[DEFAULT_BAND]})</option>
              {FULFILMENT_BANDS.map((b) => <option key={b} value={b}>{BAND_LABELS[b]}</option>)}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

export function FulfilmentRulesCard() {
  const { data, isLoading } = useFulfilmentRules();
  const save = useSetFulfilmentRules();
  const [form, setForm] = useState<Record<string, string>>({});
  const [stateBands, setStateBands] = useState<StateBands>({});
  const [require, setRequire] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      HIGH: String(data.bandFeesNgn.HIGH / 100),
      MEDIUM: String(data.bandFeesNgn.MEDIUM / 100),
      LOW: String(data.bandFeesNgn.LOW / 100),
      packaging: String(data.defaultPackagingNgn / 100),
      platform: String(data.defaultPlatformPercent),
      fxBuffer: String(data.fxBufferPercent),
      split: String(data.defaultSplitPercent),
    });
    setStateBands(data.stateBands);
    setRequire(data.requireRecipientConfirmation);
  }, [data]);

  const n = (k: string) => Number(form[k]);
  const kobo = (k: string) => Math.round(n(k) * 100);
  const keys = ['HIGH', 'MEDIUM', 'LOW', 'packaging', 'platform', 'fxBuffer', 'split'];
  const blank = keys.some((k) => (form[k] ?? '') === '');
  const bandFeesNgn = { HIGH: kobo('HIGH'), MEDIUM: kobo('MEDIUM'), LOW: kobo('LOW') };
  const payload: FulfilmentRules = {
    bandFeesNgn,
    stateBands,
    defaultPackagingNgn: kobo('packaging'),
    defaultPlatformPercent: n('platform'),
    fxBufferPercent: n('fxBuffer'),
    defaultSplitPercent: n('split'),
    requireRecipientConfirmation: require,
  };
  // The API's own bounds (fulfilmentRulesSchema in @luvngift/shared), not a copy.
  const valid = !blank && fulfilmentRulesSchema.safeParse(payload).success;
  const feeProblem = blank ? null : bandFeeProblem(bandFeesNgn);

  const field = (key: string, label: string, hint: string) => (
    <div className="space-y-2">
      <Label htmlFor={`ff-${key}`}>{label}</Label>
      <Input id={`ff-${key}`} inputMode="decimal" value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fulfilment partners</CardTitle>
        <p className="text-sm text-muted-foreground">
          One partner sources, packs and delivers each order and is paid the goods plus the fulfilment fee for the
          recipient&apos;s state band. Bundles and plans are priced on the High fee plus packaging, grossed up by the
          platform share, the FX buffer and card fees. Customers see one all-in price.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              {field('HIGH', 'High band fee (₦)', 'Paid per order in a High state. Every price is built on this.')}
              {field('MEDIUM', 'Medium band fee (₦)', 'Paid per order in a Medium state. Not above High.')}
              {field('LOW', 'Low band fee (₦)', 'Paid per order in a Low state. Not above High.')}
            </div>
            {feeProblem && <p className="text-sm text-destructive">{feeProblem}</p>}
            <StateBandGrid value={stateBands} onChange={setStateBands} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {field('packaging', 'Default packaging (₦)', 'The branded box per order. Prefilled on a new bundle or plan.')}
              {field('platform', 'Default platform share (%)', 'Prefilled. 0–60.')}
              {field('fxBuffer', 'FX buffer (%)', 'Headroom for the naira strengthening while a price is fixed. 0–30.')}
              {field('split', 'Default upfront (%)', 'For a partner paid part upfront who has no percent of their own.')}
            </div>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={require} onChange={(e) => setRequire(e.target.checked)} />
              <span>
                <span className="font-medium">Require the recipient&apos;s code before delivery.</span>{' '}
                <span className="text-muted-foreground">
                  A partner cannot upload the delivery photo until the recipient confirms (you can confirm for them on
                  the order). Leave off until you have seen texts reach recipients reliably.
                </span>
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              Changing a fee does not reprice anything: republish a bundle or plan to apply it. Raising the High fee
              makes the daily margin check flag every price built on the old one. Orders already placed keep the fee
              they were placed with.
            </p>
            <Button disabled={save.isPending || !valid} onClick={() => save.mutate(payload)}>
              {save.isPending ? 'Saving...' : 'Save fulfilment settings'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

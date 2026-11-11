'use client';

/**
 * The cost stack an admin prices a bundle or plan with: the goods (₦), the
 * agent's and delivery partner's fees (₦) and the platform's share. The API
 * grosses these up into ONE all-in price; the parts are never shown to a
 * customer (an itemised fee would likely be taxable in Canada).
 */

import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PricedCurrency, StackQuote, StackSplit } from '@/hooks/use-admin';
import { useFulfilmentRules } from '@/hooks/use-partners';
import type { BundlePricingFormValues } from '@/lib/admin-schemas';
import { formatMoney } from '@luvngift/shared';

/** Every price is written one way, everywhere (formatMoney in @luvngift/shared). */
export const money = formatMoney;
export const pct = (bps: number) => `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`;
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;

type StackValues = Pick<BundlePricingFormValues, 'sourcingMajor' | 'agentFeeMajor' | 'deliveryFeeMajor' | 'platformPercent'>;

function Field({
  id,
  label,
  hint,
  value,
  error,
  placeholder,
  onChange,
  readOnly = false,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" placeholder={placeholder} value={value} aria-invalid={!!error} readOnly={readOnly} className={readOnly ? 'bg-muted' : undefined} onChange={(e) => onChange(e.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** The four inputs. `goodsLabel` differs: a bundle's contents vs a plan's box allowance. */
export function CostStackInputs<T extends StackValues>({
  value,
  onChange,
  errors,
  goodsLabel = 'Goods cost (₦)',
  goodsHint = 'What the contents cost to buy in Nigeria.',
  goodsReadOnly = false,
  idPrefix = 'stack',
}: {
  value: T;
  onChange: (next: T) => void;
  errors: Record<string, string | undefined>;
  goodsLabel?: string;
  goodsHint?: string;
  /** The goods line is worked out elsewhere (a curated box's catalogue cost). */
  goodsReadOnly?: boolean;
  idPrefix?: string;
}) {
  const set = (key: keyof StackValues) => (v: string) => onChange({ ...value, [key]: v });
  const { data: defaults } = useFulfilmentRules();
  // A blank stack (a new item, or one priced the old way) starts from Settings → Fulfilment.
  useEffect(() => {
    if (!defaults || value.agentFeeMajor || value.deliveryFeeMajor || value.platformPercent) return;
    onChange({
      ...value,
      agentFeeMajor: String(defaults.defaultAgentFeeNgn / 100),
      deliveryFeeMajor: String(defaults.defaultDeliveryFeeNgn / 100),
      platformPercent: String(defaults.defaultPlatformPercent),
    });
    // Only when the defaults arrive or the stack is blanked, not on every keystroke.
  }, [defaults, value.agentFeeMajor === '' && value.deliveryFeeMajor === '' && value.platformPercent === '']);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={`${idPrefix}-goods`} label={goodsLabel} hint={goodsHint} placeholder="85000" value={value.sourcingMajor} error={errors.sourcingMajor} onChange={set('sourcingMajor')} readOnly={goodsReadOnly} />
      <Field id={`${idPrefix}-platform`} label="Platform share (%)" hint="What Luvngift keeps of the price, after card fees." placeholder="25" value={value.platformPercent} error={errors.platformPercent} onChange={set('platformPercent')} />
      <Field id={`${idPrefix}-agent`} label="Agent fee (₦)" hint="Paid to the agent who owns the order in the state." placeholder="5000" value={value.agentFeeMajor} error={errors.agentFeeMajor} onChange={set('agentFeeMajor')} />
      <Field id={`${idPrefix}-delivery`} label="Delivery fee (₦)" hint="Paid to whoever delivers it. 0 if the agent delivers for their fee." placeholder="4000" value={value.deliveryFeeMajor} error={errors.deliveryFeeMajor} onChange={set('deliveryFeeMajor')} />
    </div>
  );
}

/** How the price was built, in one sentence an admin can check by hand. */
export function StackSummary({ quote }: { quote: StackQuote }) {
  const { stack, rates } = quote;
  const partners = stack.goodsNgn + stack.agentFeeNgn + stack.deliveryFeeNgn;
  return (
    <p className="text-xs text-muted-foreground">
      Partners {naira(partners)} (goods {naira(stack.goodsNgn)} + agent {naira(stack.agentFeeNgn)} + delivery{' '}
      {naira(stack.deliveryFeeNgn)}) = {money(Math.round(quote.costUsdCents), 'USD')} at ₦{rates.NGN.toLocaleString('en-NG')}/US$,
      divided by {100 - quote.deductionPercent}% (platform {pct(quote.platformBps)} + FX buffer {quote.fxBufferPercent}% +
      dearest card fee {Math.max(...Object.values(quote.cardFeePercent))}%) = <strong className="text-foreground">{money(quote.usdCents, 'USD')}</strong>.
      The customer sees this one price; partners are paid their naira amounts.
    </p>
  );
}

const SPLIT_COLUMNS: { key: keyof StackSplit; label: string }[] = [
  { key: 'cardFees', label: 'Card fees' },
  { key: 'goods', label: 'Goods' },
  { key: 'agent', label: 'Agent' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'platform', label: 'Luvngift keeps' },
];

/** Split cells for one charge, for use inside a caller's table row. */
export function SplitCells({ split, currency }: { split: StackSplit; currency: PricedCurrency | string }) {
  return (
    <>
      {SPLIT_COLUMNS.map(({ key, label }) => (
        <td key={label} className={`px-2 py-1.5 whitespace-nowrap ${key === 'platform' && split.platform < 0 ? 'text-destructive font-semibold' : ''}`}>
          {money(split[key], currency)}
          {key === 'platform' && <span className="text-muted-foreground"> ({pct(split.platformBps)})</span>}
        </td>
      ))}
    </>
  );
}

export const SPLIT_HEADERS = SPLIT_COLUMNS.map((c) => c.label);

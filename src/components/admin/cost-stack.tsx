'use client';

/**
 * The cost stack an admin prices a bundle or plan with: the goods (₦), the
 * branded packaging (₦) and the platform's share. The fulfilment fee is not
 * typed here: it is the High band fee from Settings → Fulfilment, so the price
 * covers an order to any state (the partner is paid the recipient's band).
 * The API grosses these up into ONE all-in price; the parts are never shown
 * to a customer (an itemised fee would likely be taxable in Canada).
 */

import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PricedCurrency, StackQuote, StackSplit } from '@/hooks/use-admin';
import { useFulfilmentRules } from '@/hooks/use-partners';
import type { BundlePricingFormValues } from '@/lib/admin-schemas';
import { formatMoney, pricingFeeNgn } from '@luvngift/shared';

/** Every price is written one way, everywhere (formatMoney in @luvngift/shared). */
export const money = formatMoney;
export const pct = (bps: number) => `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`;
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;

type StackValues = Pick<BundlePricingFormValues, 'sourcingMajor' | 'packagingMajor' | 'platformPercent'>;

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

/** The inputs, plus the High band fee they are priced on (read-only). `goodsLabel` differs: a bundle's contents vs a plan's box allowance. */
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
    if (!defaults || value.packagingMajor || value.platformPercent) return;
    onChange({
      ...value,
      packagingMajor: String(defaults.defaultPackagingNgn / 100),
      platformPercent: String(defaults.defaultPlatformPercent),
    });
    // Only when the defaults arrive or the stack is blanked, not on every keystroke.
  }, [defaults, value.packagingMajor === '' && value.platformPercent === '']);
  const highFee = defaults ? String(pricingFeeNgn(defaults) / 100) : '';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={`${idPrefix}-goods`} label={goodsLabel} hint={goodsHint} placeholder="85000" value={value.sourcingMajor} error={errors.sourcingMajor} onChange={set('sourcingMajor')} readOnly={goodsReadOnly} />
      <Field id={`${idPrefix}-platform`} label="Platform share (%)" hint="What Luvngift keeps of the price, after card fees." placeholder="25" value={value.platformPercent} error={errors.platformPercent} onChange={set('platformPercent')} />
      <Field id={`${idPrefix}-packaging`} label="Packaging (₦)" hint="The Luvngift box and wrapping we send the partner. Our cost; 0 if none." placeholder="2000" value={value.packagingMajor} error={errors.packagingMajor} onChange={set('packagingMajor')} />
      <Field id={`${idPrefix}-fee`} label="Fulfilment fee (₦, High band)" hint="Set in Settings → Fulfilment. Every price uses the High band so it covers any state." placeholder="" value={highFee} onChange={() => undefined} readOnly />
    </div>
  );
}

/** How the price was built, in one sentence an admin can check by hand. */
export function StackSummary({ quote }: { quote: StackQuote }) {
  const { stack, rates } = quote;
  const cost = stack.goodsNgn + stack.fulfilmentFeeNgn + stack.packagingNgn;
  return (
    <p className="text-xs text-muted-foreground">
      Costs {naira(cost)} (goods {naira(stack.goodsNgn)} + fulfilment fee {naira(stack.fulfilmentFeeNgn)} (High band) + packaging{' '}
      {naira(stack.packagingNgn)}) = {money(Math.round(quote.costUsdCents), 'USD')} at ₦{rates.NGN.toLocaleString('en-NG')}/US$,
      divided by {100 - quote.deductionPercent}% (platform {pct(quote.platformBps)} + FX buffer {quote.fxBufferPercent}% +
      dearest card fee {Math.max(...Object.values(quote.cardFeePercent))}%) = <strong className="text-foreground">{money(quote.usdCents, 'USD')}</strong>.
      The customer sees this one price; the partner is paid goods + the fee for the recipient's band.
    </p>
  );
}

const SPLIT_COLUMNS: { key: keyof StackSplit; label: string }[] = [
  { key: 'cardFees', label: 'Card fees' },
  { key: 'goods', label: 'Goods' },
  { key: 'fulfilmentFee', label: 'Fulfilment fee' },
  { key: 'packaging', label: 'Packaging' },
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

'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useBundlePricingPreview,
  usePublishBundlePricing,
  type BundlePricingPreview,
} from '@/hooks/use-admin';
import {
  bundlePricingFormSchema,
  toBundlePricingInput,
  fieldErrors,
  type BundlePricingFormValues,
} from '@/lib/admin-schemas';

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: 'US$', GBP: '£' };
const money = (cents: number, currency: string) =>
  `${cents < 0 ? '−' : ''}${SYMBOLS[currency] ?? currency}${(Math.abs(cents) / 100).toFixed(2)}`;
const pct = (bps: number) => `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`;

export const EMPTY_BUNDLE_PRICING: BundlePricingFormValues = { sourcingMajor: '', markupPercent: '' };

/** A priced bundle's current inputs, or blank for a legacy (hand-priced) one. */
export const pricingOf = (b: { sourcingNgn?: number | null; markupBps?: number | null }): BundlePricingFormValues => ({
  sourcingMajor: b.sourcingNgn ? String(b.sourcingNgn / 100) : '',
  markupPercent: b.markupBps != null ? String(b.markupBps / 100) : '',
});

/**
 * Sourcing amount and markup, with the price they make at today's rate. The
 * preview re-runs as the admin types (debounced); nothing is saved here.
 */
export function BundlePricingFields({
  value,
  onChange,
  bundleId,
  onPreview,
}: {
  value: BundlePricingFormValues;
  onChange: (next: BundlePricingFormValues) => void;
  bundleId?: string;
  onPreview?: (preview: BundlePricingPreview | null) => void;
}) {
  const preview = useBundlePricingPreview();
  const parsed = bundlePricingFormSchema.safeParse(value);
  const errors = parsed.success ? {} : fieldErrors(parsed.error);
  const touched = value.sourcingMajor !== '' || value.markupPercent !== '';

  useEffect(() => {
    if (!parsed.success) {
      onPreview?.(null);
      return;
    }
    const timer = setTimeout(() => {
      preview.mutate(
        { ...toBundlePricingInput(parsed.data), bundleId },
        { onSuccess: (p) => onPreview?.(p), onError: () => onPreview?.(null) },
      );
    }, 400);
    return () => clearTimeout(timer);
    // Re-run only when the inputs change, not on every render of `preview`.
  }, [value.sourcingMajor, value.markupPercent, bundleId]);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bundle-sourcing">Sourcing cost (₦)</Label>
          <Input
            id="bundle-sourcing"
            inputMode="decimal"
            value={value.sourcingMajor}
            onChange={(e) => onChange({ ...value, sourcingMajor: e.target.value })}
            placeholder="e.g. 85000"
          />
          <p className="text-xs text-muted-foreground">What one bundle&apos;s contents cost to buy in Nigeria.</p>
          {touched && errors.sourcingMajor && <p className="text-xs text-destructive">{errors.sourcingMajor}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bundle-markup">Markup (%)</Label>
          <Input
            id="bundle-markup"
            inputMode="decimal"
            value={value.markupPercent}
            onChange={(e) => onChange({ ...value, markupPercent: e.target.value })}
            placeholder="e.g. 60"
          />
          {touched && errors.markupPercent && <p className="text-xs text-destructive">{errors.markupPercent}</p>}
        </div>
      </div>
      {preview.isPending && <Spinner size="sm" />}
      {preview.isError && (
        <p className="text-xs text-destructive">
          {(preview.error as any)?.response?.data?.error?.message ?? 'Could not work out the price'}
        </p>
      )}
      {preview.data && parsed.success && !preview.isPending && <PreviewTable preview={preview.data} />}
    </div>
  );
}

function PreviewTable({ preview }: { preview: BundlePricingPreview }) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        Costs <strong>{money(Math.round(preview.costUsdCents), 'USD')}</strong> at ₦
        {preview.rates.NGN.toLocaleString('en-NG')}/US$ → price{' '}
        <strong>{money(preview.usdCents, 'USD')}</strong>
        {preview.current !== null && preview.change !== 'SAME' && (
          <span className="text-muted-foreground"> (now {money(preview.current, 'USD')})</span>
        )}
        {preview.change === 'SAME' && <span className="text-muted-foreground"> (unchanged)</span>}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[360px]">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th className="py-1 font-medium">Buyer pays today</th>
              <th className="py-1 font-medium">Vendor share</th>
              <th className="py-1 font-medium">Vendor keeps after goods</th>
              <th className="py-1 font-medium">Luvngift after card fees</th>
            </tr>
          </thead>
          <tbody>
            {preview.lines.map((l) => (
              <tr key={l.currency} className="border-t">
                <td className="py-1">{money(l.amount, l.currency)}</td>
                <td className="py-1">{money(l.split.vendor, l.currency)}</td>
                <td className={`py-1 ${l.vendorMargin < 0 ? 'text-destructive font-semibold' : ''}`}>
                  {money(l.vendorMargin, l.currency)}
                </td>
                <td className="py-1">{money(l.split.luvngift, l.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        CA$ and £ are indicative: checkout converts the US$ price at the rate on the day. The vendor breaks
        even above {pct(preview.breakEvenMarkupBps)} markup.
      </p>
      {preview.problems.map((p) => (
        <p key={p} className="text-xs text-destructive flex gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {p}
        </p>
      ))}
    </div>
  );
}

/** Republishes an existing bundle's price. Applies from the next checkout. */
export function BundlePricingDialog({
  bundle,
  onClose,
}: {
  bundle: { id: string; name: string; sourcingNgn?: number | null; markupBps?: number | null };
  onClose: () => void;
}) {
  const [value, setValue] = useState(pricingOf(bundle));
  const [preview, setPreview] = useState<BundlePricingPreview | null>(null);
  const publish = usePublishBundlePricing();
  const legacy = bundle.sourcingNgn == null;
  const canPublish = !!preview && preview.problems.length === 0 && preview.change !== 'SAME' && !publish.isPending;

  const submit = async () => {
    const parsed = bundlePricingFormSchema.safeParse(value);
    if (!parsed.success) return;
    try {
      await publish.mutateAsync({ bundleId: bundle.id, ...toBundlePricingInput(parsed.data) });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !publish.isPending) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Price {bundle.name}</DialogTitle>
          <DialogDescription>
            {legacy
              ? 'This bundle has a hand-typed price. Set its sourcing cost and markup to derive the price instead.'
              : 'The US$ price is worked out at today’s rate and stays fixed until you publish again.'}{' '}
            The new price applies from the next checkout; orders already placed keep theirs.
          </DialogDescription>
        </DialogHeader>
        <BundlePricingFields value={value} onChange={setValue} bundleId={bundle.id} onPreview={setPreview} />
        <div className="flex gap-2 pt-1">
          <Button onClick={submit} disabled={!canPublish}>
            {publish.isPending ? <><Spinner size="sm" className="mr-2" />Publishing…</> : 'Publish price'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={publish.isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

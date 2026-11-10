'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useBundlePricingPreview,
  usePublishBundlePricing,
  type BundlePricingPreview,
  type PricedCurrency,
} from '@/hooks/use-admin';
import {
  bundlePricingFormSchema,
  toBundlePricingInput,
  fieldErrors,
  stackFormValues,
  type BundlePricingFormValues,
} from '@/lib/admin-schemas';
import { CostStackInputs, SPLIT_HEADERS, SplitCells, StackSummary, money } from '@/components/admin/cost-stack';

export const EMPTY_BUNDLE_PRICING: BundlePricingFormValues = {
  sourcingMajor: '',
  agentFeeMajor: '',
  deliveryFeeMajor: '',
  platformPercent: '',
};

type PricedBundle = {
  sourcingNgn?: number | null;
  agentFeeNgn?: number | null;
  deliveryFeeNgn?: number | null;
  platformBps?: number | null;
};

/** A cost-stack bundle's current inputs; a legacy bundle keeps only its goods cost. */
export const pricingOf = (b: PricedBundle): BundlePricingFormValues =>
  stackFormValues({ goodsNgn: b.sourcingNgn, agentFeeNgn: b.agentFeeNgn, deliveryFeeNgn: b.deliveryFeeNgn, platformBps: b.platformBps });

/**
 * The cost stack, with the price it makes at today's rate. The preview re-runs
 * as the admin types (debounced); nothing is saved here.
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
  const touched = Object.values(value).some((v) => v !== '');
  const errors = parsed.success || !touched ? {} : fieldErrors(parsed.error);

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
  }, [value.sourcingMajor, value.agentFeeMajor, value.deliveryFeeMajor, value.platformPercent, bundleId]);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <CostStackInputs value={value} onChange={onChange} errors={errors} goodsHint="What one bundle's contents cost to buy in Nigeria." idPrefix="bundle" />
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
  const currencies = Object.keys(preview.amounts) as PricedCurrency[];
  return (
    <div className="space-y-2 text-sm">
      <p>
        Price <strong>{money(preview.usdCents, 'USD')}</strong>
        {preview.current !== null && preview.change !== 'SAME' && (
          <span className="text-muted-foreground"> (now {money(preview.current, 'USD')})</span>
        )}
        {preview.change === 'SAME' && <span className="text-muted-foreground"> (unchanged)</span>}
      </p>
      <StackSummary quote={preview} />
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[520px]">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th className="px-2 py-1 font-medium">Buyer pays today</th>
              {SPLIT_HEADERS.map((h) => <th key={h} className="px-2 py-1 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {currencies.map((c) => (
              <tr key={c} className="border-t">
                <td className="px-2 py-1.5 font-medium">{money(preview.amounts[c], c)}</td>
                <SplitCells split={preview.splits[c]} currency={c} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        CA$ and £ are indicative: checkout converts the US$ price at the rate on the day.
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
  bundle: { id: string; name: string } & PricedBundle;
  onClose: () => void;
}) {
  const [value, setValue] = useState(pricingOf(bundle));
  const [preview, setPreview] = useState<BundlePricingPreview | null>(null);
  const publish = usePublishBundlePricing();
  const legacy = bundle.platformBps == null;
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Price {bundle.name}</DialogTitle>
          <DialogDescription>
            {legacy
              ? 'This bundle is priced the old way (a markup). Set its goods cost, partner fees and platform share to derive the price from the cost stack.'
              : 'The US$ price is worked out at today’s rate and stays fixed until you publish again.'}{' '}
            The new price applies from the next checkout; orders already placed keep theirs, and keep what their partners are owed.
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

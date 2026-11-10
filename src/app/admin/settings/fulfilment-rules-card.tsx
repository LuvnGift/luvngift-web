'use client';

/**
 * Settings → Fulfilment: the defaults a new cost stack starts from, the FX
 * buffer every cost-stack price carries, the default split, and whether the
 * recipient's code is required before an order counts as delivered.
 * Bounds mirror `fulfilmentRulesSchema` in the API's partners.validation.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useFulfilmentRules, useSetFulfilmentRules } from '@/hooks/use-partners';

export function FulfilmentRulesCard() {
  const { data, isLoading } = useFulfilmentRules();
  const save = useSetFulfilmentRules();
  const [form, setForm] = useState<Record<string, string>>({});
  const [require, setRequire] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      agentFee: String(data.defaultAgentFeeNgn / 100),
      deliveryFee: String(data.defaultDeliveryFeeNgn / 100),
      platform: String(data.defaultPlatformPercent),
      fxBuffer: String(data.fxBufferPercent),
      split: String(data.defaultSplitPercent),
    });
    setRequire(data.requireRecipientConfirmation);
  }, [data]);

  const n = (k: string) => Number(form[k]);
  const within = (k: string, min: number, max: number) => form[k] !== '' && Number.isFinite(n(k)) && n(k) >= min && n(k) <= max;
  const valid =
    within('agentFee', 0, 100_000_000) &&
    within('deliveryFee', 0, 100_000_000) &&
    within('platform', 0, 60) &&
    within('fxBuffer', 0, 30) &&
    within('split', 0, 100) &&
    Number.isInteger(n('split'));

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
          Bundles and plans are priced from a cost stack: goods + agent fee + delivery fee in naira, grossed up
          by the platform share, the FX buffer and card fees. Customers see one all-in price.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              {field('agentFee', 'Default agent fee (₦)', 'Prefilled on a new bundle or plan.')}
              {field('deliveryFee', 'Default delivery fee (₦)', 'Prefilled on a new bundle or plan.')}
              {field('platform', 'Default platform share (%)', 'Prefilled. 0–60.')}
              {field('fxBuffer', 'FX buffer (%)', 'Headroom for the naira strengthening while a price is fixed. Applies to every cost-stack price. 0–30.')}
              {field('split', 'Default split (%)', 'For a Split partner with no percentage of their own: paid on assignment.')}
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
              Changing these does not reprice anything: republish a bundle or plan to apply them.
            </p>
            <Button
              disabled={save.isPending || !valid}
              onClick={() =>
                save.mutate({
                  defaultAgentFeeNgn: Math.round(n('agentFee') * 100),
                  defaultDeliveryFeeNgn: Math.round(n('deliveryFee') * 100),
                  defaultPlatformPercent: n('platform'),
                  fxBufferPercent: n('fxBuffer'),
                  defaultSplitPercent: n('split'),
                  requireRecipientConfirmation: require,
                })
              }
            >
              {save.isPending ? 'Saving...' : 'Save fulfilment settings'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

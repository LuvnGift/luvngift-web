'use client';

import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BoxPicker } from '@/components/subscriptions/box-picker';
import { boxFill } from '@/lib/box-fill';
import {
  useCatalogue,
  usePlans,
  useUpdateSubscriptionItems,
  useBasketQuote,
  isBasket,
  type BoxPlan,
  type Subscription,
} from '@/hooks/use-subscriptions';

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: 'US$', GBP: '£' };
const money = (cents: number, currency: string) => `${SYMBOLS[currency] ?? currency}${(cents / 100).toFixed(2)}`;

/** Fallback if the plans payload has no minimum (matches the API default). */
const DEFAULT_MIN_FILL = 80;

/**
 * The API returns the subscription's address id, which the shared Subscription
 * type does not declare yet; the catalogue is scoped by it (items vary by state).
 */
type EditableSubscription = Subscription & { addressId?: string; address: { id?: string }; amount?: number | null };

const toPicked = (sub: Subscription) =>
  Object.fromEntries(sub.items.map((i) => [i.customItem.id, i.quantity]));

/**
 * A subscriber changing what is in their box. Same picker and rules as
 * sign-up; a change applies from the next delivery, because a delivery
 * already paid for is already being prepared.
 */
export function BoxEditor({ sub }: { sub: Subscription }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => setOpen(true)}>
        <PackageOpen className="h-3.5 w-3.5 mr-1.5" />
        {sub.items.length ? 'Change box' : 'Choose your items'}
      </Button>
      {open && <BoxEditorDialog sub={sub as EditableSubscription} onClose={() => setOpen(false)} />}
    </>
  );
}

function BoxEditorDialog({ sub, onClose }: { sub: EditableSubscription; onClose: () => void }) {
  const addressId = sub.addressId ?? sub.address.id;
  const { data: items, isLoading } = useCatalogue(addressId, sub.plan.id);
  const { data: plans } = usePlans();
  const update = useUpdateSubscriptionItems();
  const [picked, setPicked] = useState<Record<string, number>>(toPicked(sub));

  const plan = plans?.find((p) => p.id === sub.plan.id) as BoxPlan | undefined;
  const basket = isBasket(sub.plan);
  const minFill = basket ? 0 : plan?.boxMinFillPercent ?? DEFAULT_MIN_FILL;
  const fill = boxFill(picked, items ?? [], minFill);
  const { data: quote, isFetching: quoting, isError: quoteFailed } = useBasketQuote(
    sub.plan.id, addressId, picked, basket && fill.status === 'OK',
  );
  const newPrice = basket && !quoting && !quoteFailed ? quote?.amount ?? null : null;
  const ready = fill.status === 'OK' && (!basket || newPrice !== null);

  const save = async () => {
    const next = Object.entries(picked).map(([customItemId, quantity]) => ({ customItemId, quantity }));
    try {
      await update.mutateAsync({ id: sub.id, items: next, ...(basket && newPrice !== null ? { expectedAmount: newPrice } : {}) });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !update.isPending) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change your {sub.plan.name} {basket ? 'basket' : 'box'}</DialogTitle>
          <DialogDescription>
            {basket
              ? 'Changes apply from your next delivery, and so does the new price for what is in it.'
              : `Changes apply from your next delivery. Up to ${sub.plan.slotCount} different items, in any quantity, until the box is at least ${minFill}% full.`}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <BoxPicker items={items ?? []} picked={picked} onChange={setPicked} slotCount={basket ? 50 : sub.plan.slotCount} minFill={minFill} basket={basket} />
        )}
        {basket && (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            Price per delivery:{' '}
            <strong>
              {newPrice !== null && quote ? money(newPrice, quote.currency) : quoting ? '…' : '—'}
            </strong>
            {sub.amount != null && newPrice !== null && newPrice !== sub.amount && (
              <span className="text-muted-foreground"> (now {money(sub.amount, sub.currency)}), from your next delivery</span>
            )}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={update.isPending || !ready}>
            {update.isPending ? <><Spinner size="sm" className="mr-2" />Saving…</> : basket ? 'Save basket at this price' : 'Save box'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

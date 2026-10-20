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
  type BoxPlan,
  type Subscription,
} from '@/hooks/use-subscriptions';

/** Fallback if the plans payload has no minimum (matches the API default). */
const DEFAULT_MIN_FILL = 80;

/**
 * The API returns the subscription's address id, which the shared Subscription
 * type does not declare yet; the catalogue is scoped by it (items vary by state).
 */
type EditableSubscription = Subscription & { addressId?: string; address: { id?: string } };

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
  const minFill = plan?.boxMinFillPercent ?? DEFAULT_MIN_FILL;
  const fill = boxFill(picked, items ?? [], minFill);

  const save = async () => {
    const next = Object.entries(picked).map(([customItemId, quantity]) => ({ customItemId, quantity }));
    try {
      await update.mutateAsync({ id: sub.id, items: next });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !update.isPending) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change your {sub.plan.name} box</DialogTitle>
          <DialogDescription>
            Changes apply from your next delivery. Up to {sub.plan.slotCount} different items, in any
            quantity, until the box is at least {minFill}% full.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <BoxPicker items={items ?? []} picked={picked} onChange={setPicked} slotCount={sub.plan.slotCount} minFill={minFill} />
        )}
        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={update.isPending || fill.status !== 'OK'}>
            {update.isPending ? <><Spinner size="sm" className="mr-2" />Saving…</> : 'Save box'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { PackageOpen, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BoxPicker } from '@/components/subscriptions/box-picker';
import { boxFill } from '@/lib/box-fill';
import {
  useAdminSubscriptionBox,
  useUpdateAdminSubscriptionBox,
  type AdminSubscriptionBox,
} from '@/hooks/use-admin';

interface CycleOrder {
  id: string;
  status: string;
  vendorId?: string | null;
  isFlagged?: boolean;
  subscription?: { id: string } | null;
}

const MIN_REASON = 10; // mirrors adminBoxEditSchema in the API

/**
 * The subscription box behind a cycle order, and admin editing of it.
 *
 * Gated by accountability rather than a passcode: a reason is required, the
 * edit is audited, and the subscriber is emailed the new box and the reason.
 * The same box rules apply as to the subscriber's own edit.
 */
export function SubscriptionBoxSection({ order }: { order: CycleOrder }) {
  const subscriptionId = order.subscription?.id;
  const { data: box, isLoading } = useAdminSubscriptionBox(subscriptionId);
  const [open, setOpen] = useState(false);
  if (!subscriptionId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
          <PackageOpen className="h-3.5 w-3.5" /> Subscription box
        </p>
        {box && box.subscription.status !== 'CANCELLED' && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
            Edit box
          </Button>
        )}
      </div>
      {isLoading ? (
        <Spinner size="sm" />
      ) : box?.items.length ? (
        <p className="text-sm text-muted-foreground">
          {box.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
        </p>
      ) : (
        <p className="text-sm text-red-700">No items chosen. Future deliveries will be held until the box is filled.</p>
      )}
      <p className="text-xs text-muted-foreground">These are the items for future deliveries. This delivery&apos;s items are listed above.</p>
      {open && box && <EditBoxDialog box={box} order={order} onClose={() => setOpen(false)} />}
    </div>
  );
}

function EditBoxDialog({ box, order, onClose }: { box: AdminSubscriptionBox; order: CycleOrder; onClose: () => void }) {
  const update = useUpdateAdminSubscriptionBox();
  const [picked, setPicked] = useState<Record<string, number>>(
    Object.fromEntries(box.items.map((i) => [i.customItemId, i.quantity])),
  );
  const [reason, setReason] = useState('');
  // Only a delivery no vendor has started on can be rewritten (the API enforces it).
  const orderEditable = order.status === 'PENDING' && !order.vendorId;
  const [applyToOrder, setApplyToOrder] = useState(orderEditable && !!order.isFlagged);
  const fill = boxFill(picked, box.catalogue, box.minFillPercent);
  const { subscription: sub } = box;
  const canSave = fill.status === 'OK' && reason.trim().length >= MIN_REASON && !update.isPending;

  const save = async () => {
    try {
      await update.mutateAsync({
        subscriptionId: sub.id,
        items: Object.entries(picked).map(([customItemId, quantity]) => ({ customItemId, quantity })),
        reason: reason.trim(),
        applyToOrderId: applyToOrder ? order.id : undefined,
      });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !update.isPending) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit the {sub.planName} box</DialogTitle>
          <DialogDescription>
            The subscriber is emailed the new box and your reason, and the change is recorded in the
            audit log. Items available in {sub.recipientState}.
          </DialogDescription>
        </DialogHeader>
        {(sub.dietaryFlags.length > 0 || sub.dietaryNotes) && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Dietary constraints: nothing chosen may contain these</p>
              {sub.dietaryFlags.length > 0 && <p className="mt-0.5">{sub.dietaryFlags.join(', ')}</p>}
              {sub.dietaryNotes && <p className="mt-0.5 italic">{sub.dietaryNotes}</p>}
            </div>
          </div>
        )}
        <BoxPicker items={box.catalogue} picked={picked} onChange={setPicked} slotCount={sub.slotCount} minFill={box.minFillPercent} whose="the" />
        <div className="space-y-1.5">
          <Label htmlFor="box-reason">Reason (sent to the subscriber)</Label>
          <Textarea id="box-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. You asked us by phone to swap the beans for more rice." />
          {reason.trim().length > 0 && reason.trim().length < MIN_REASON && (
            <p className="text-xs text-muted-foreground">A few more words, please.</p>
          )}
        </div>
        <label className={`flex items-start gap-2 text-sm ${orderEditable ? 'cursor-pointer' : 'opacity-60'}`}>
          <input type="checkbox" className="h-4 w-4 mt-0.5" disabled={!orderEditable} checked={applyToOrder} onChange={(e) => setApplyToOrder(e.target.checked)} />
          <span>
            Also apply to this delivery
            <span className="block text-xs text-muted-foreground">
              {orderEditable
                ? 'Replaces this order’s items and clears its review flag. Assign the vendor afterwards.'
                : 'Not available: a vendor already has this delivery.'}
            </span>
          </span>
        </label>
        <div className="flex gap-2 pt-1">
          <Button onClick={save} disabled={!canSave}>
            {update.isPending ? <><Spinner size="sm" className="mr-2" />Saving…</> : 'Save and email subscriber'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

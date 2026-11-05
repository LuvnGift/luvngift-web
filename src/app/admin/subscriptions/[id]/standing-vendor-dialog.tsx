'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSetStandingVendor, useVendors, type AdminSubscriptionDetail } from '@/hooks/use-admin';
import { MIN_REASON } from './action-dialog';

const NONE = 'none';

/** Only approved, active vendors are offered — the API refuses anyone else. */
export function StandingVendorDialog({ sub, onClose }: { sub: AdminSubscriptionDetail; onClose: () => void }) {
  const { data, isLoading } = useVendors(1, 100, '', false, 'APPROVED');
  const save = useSetStandingVendor();
  const [vendorId, setVendorId] = useState(sub.vendor?.id ?? NONE);
  const [reason, setReason] = useState('');
  const vendors: { id: string; name: string; state: string }[] = data?.vendors ?? [];
  const unchanged = vendorId === (sub.vendor?.id ?? NONE);
  const canSave = !unchanged && reason.trim().length >= MIN_REASON && !save.isPending;

  const submit = async () => {
    try {
      await save.mutateAsync({ id: sub.id, vendorId: vendorId === NONE ? null : vendorId, reason: reason.trim() });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !save.isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change standing vendor</DialogTitle>
          <DialogDescription>
            Future deliveries to {sub.address.recipientName} in {sub.address.state} go to this vendor automatically.
            Deliveries already assigned are not moved. The subscriber is not emailed.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="standing-vendor">Vendor</Label>
            <select
              id="standing-vendor"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            >
              <option value={NONE}>None: assign each delivery by hand</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.state}{v.state === sub.address.state ? ' (same state)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="vendor-reason">Reason (audit log)</Label>
          <Textarea id="vendor-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Ada Foods has stopped covering Ikeja." />
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={submit} disabled={!canSave}>
            {save.isPending ? <><Spinner size="sm" className="mr-2" />Saving…</> : 'Save'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

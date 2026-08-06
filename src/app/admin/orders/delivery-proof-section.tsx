'use client';

import { useState } from 'react';
import { Camera, ShieldAlert, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  useAttachDeliveryProof,
  useRecordSubstitutions,
  type SubstitutionRecord,
} from '@/hooks/use-admin';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  substitutedForName?: string | null;
  substitutionReason?: string | null;
  isOmitted?: boolean;
}

interface Order {
  id: string;
  items?: OrderItem[];
  deliveryProofUrl?: string | null;
  deliveryProofAt?: string | null;
  deliveryProofNote?: string | null;
  address?: { dietaryFlags?: string[]; dietaryNotes?: string | null } | null;
}

/**
 * Vendors have no portal yet (MVP 2), so admin records substitutions and uploads
 * the delivery photo on their behalf — same admin-mediated model as vendor
 * assignment.
 */
export function DeliveryProofSection({ order }: { order: Order }) {
  const attach = useAttachDeliveryProof();
  const record = useRecordSubstitutions();

  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [edits, setEdits] = useState<Record<string, SubstitutionRecord>>({});

  const items = order.items ?? [];
  const dietary = order.address?.dietaryFlags ?? [];

  const setEdit = (id: string, patch: Partial<SubstitutionRecord>) =>
    setEdits((prev) => ({
      ...prev,
      // orderItemId last so the spreads can't clobber it
      [id]: { ...prev[id], ...patch, orderItemId: id },
    }));

  const handleUpload = () => {
    if (!file) {
      toast.error('Choose a photo first');
      return;
    }
    attach.mutate(
      { orderId: order.id, file, note: note.trim() || undefined },
      { onSuccess: () => { setFile(null); setNote(''); } },
    );
  };

  const pending = Object.values(edits).filter(
    (e) => e.substitutedForName || e.isOmitted || e.deliveredName,
  );

  const handleRecord = () => {
    if (pending.length === 0) {
      toast.error('Nothing to record');
      return;
    }
    record.mutate({ orderId: order.id, items: pending }, { onSuccess: () => setEdits({}) });
  };

  return (
    <div className="space-y-5">
      {/* Dietary constraints — must be visible before anyone substitutes anything */}
      {dietary.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Dietary constraints — do not substitute across these</p>
            <p className="mt-0.5">{dietary.join(', ')}</p>
            {order.address?.dietaryNotes && (
              <p className="mt-0.5 italic">{order.address.dietaryNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Substitutions */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2 flex items-center gap-1.5">
          <Replace className="h-3.5 w-3.5" /> Substitutions
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items on this order.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const edit = edits[item.id];
              const omitted = edit?.isOmitted ?? item.isOmitted ?? false;
              return (
                <div key={item.id} className="rounded-md border p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {item.name}
                      {item.quantity > 1 && (
                        <span className="text-muted-foreground"> ×{item.quantity}</span>
                      )}
                    </p>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={omitted}
                        onChange={(e) => setEdit(item.id, { isOmitted: e.target.checked })}
                        className="h-3.5 w-3.5"
                      />
                      Omitted
                    </label>
                  </div>

                  {item.substitutedForName && (
                    <p className="text-xs text-muted-foreground">
                      Currently recorded as replacing{' '}
                      <span className="font-medium">{item.substitutedForName}</span>
                      {item.substitutionReason ? ` — ${item.substitutionReason}` : ''}
                    </p>
                  )}

                  {!omitted && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Delivered instead (leave blank if unchanged)"
                        className="h-8 text-xs"
                        value={edit?.deliveredName ?? ''}
                        onChange={(e) =>
                          setEdit(item.id, {
                            deliveredName: e.target.value,
                            substitutedForName: e.target.value ? item.name : undefined,
                          })
                        }
                      />
                      <Input
                        placeholder="Reason (shown to the customer)"
                        className="h-8 text-xs"
                        value={edit?.substitutionReason ?? ''}
                        onChange={(e) => setEdit(item.id, { substitutionReason: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <Button size="sm" onClick={handleRecord} disabled={record.isPending || pending.length === 0}>
              {record.isPending ? (
                <><Spinner size="sm" className="mr-2" />Saving…</>
              ) : (
                `Record ${pending.length || ''} change${pending.length === 1 ? '' : 's'}`
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Recording changes emails the customer a summary of what was substituted and why.
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Proof of delivery */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2 flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" /> Proof of delivery
        </p>

        {order.deliveryProofUrl ? (
          <div className="space-y-2">
            <a href={order.deliveryProofUrl} target="_blank" rel="noopener noreferrer">
              {/* Cloudinary-hosted, external to Next's image domain config */}
              <img
                src={order.deliveryProofUrl}
                alt="Proof of delivery"
                className="rounded-md border max-h-64 object-cover"
              />
            </a>
            <p className="text-xs text-muted-foreground">
              Uploaded {order.deliveryProofAt ? new Date(order.deliveryProofAt).toLocaleString() : ''}
              {order.deliveryProofNote ? ` — ${order.deliveryProofNote}` : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="proof" className="text-xs">Photo (JPEG, PNG, WebP or HEIC, max 10MB)</Label>
              <Input
                id="proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
            </div>
            <Input
              placeholder="Note (optional) — e.g. handed to recipient's daughter"
              className="h-8 text-xs"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button size="sm" onClick={handleUpload} disabled={attach.isPending || !file}>
              {attach.isPending ? (
                <><Spinner size="sm" className="mr-2" />Uploading…</>
              ) : (
                'Upload & mark delivered'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

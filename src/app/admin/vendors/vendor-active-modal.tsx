'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useSetVendorActive } from '@/hooks/use-admin';

const deactivateSchema = z.object({
  reason: z.string().trim().min(5, 'Please provide a reason (at least 5 characters)').max(500),
});

const reactivateSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

type DeactivateValues = z.infer<typeof deactivateSchema>;
type ReactivateValues = z.infer<typeof reactivateSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  /** true = we are deactivating; false = we are reactivating */
  deactivating: boolean;
}

export default function VendorActiveModal({ open, onClose, vendorId, vendorName, deactivating }: Props) {
  const setActive = useSetVendorActive();

  const deactivateForm = useForm<DeactivateValues>({
    resolver: zodResolver(deactivateSchema),
    defaultValues: { reason: '' },
  });

  const reactivateForm = useForm<ReactivateValues>({
    resolver: zodResolver(reactivateSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (open) {
      deactivateForm.reset({ reason: '' });
      reactivateForm.reset({ reason: '' });
    }
  }, [open, deactivateForm, reactivateForm]);

  const onDeactivate = async (values: DeactivateValues) => {
    await setActive.mutateAsync({ id: vendorId, isActive: false, reason: values.reason });
    onClose();
  };

  const onReactivate = async (values: ReactivateValues) => {
    await setActive.mutateAsync({ id: vendorId, isActive: true, reason: values.reason || undefined });
    onClose();
  };

  if (deactivating) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </span>
              <DialogTitle>Deactivate vendor</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground pt-1">
              <span className="font-medium text-foreground">{vendorName}</span> will stop receiving new order assignments and will be notified by email.
            </p>
          </DialogHeader>

          <form onSubmit={deactivateForm.handleSubmit(onDeactivate)} className="space-y-4 pt-2" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="vam-reason">
                Reason for deactivation <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="vam-reason"
                {...deactivateForm.register('reason')}
                placeholder="e.g. Repeated late deliveries, temporarily suspending account pending review..."
                rows={3}
              />
              {deactivateForm.formState.errors.reason && (
                <p className="text-destructive text-xs">{deactivateForm.formState.errors.reason.message}</p>
              )}
              <p className="text-xs text-muted-foreground">This reason will be included in the email sent to the vendor.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={setActive.isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={setActive.isPending}>
                {setActive.isPending ? <><Spinner size="sm" className="mr-2" />Deactivating...</> : 'Deactivate vendor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </span>
            <DialogTitle>Reactivate vendor</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground pt-1">
            <span className="font-medium text-foreground">{vendorName}</span> will be reactivated and can receive new order assignments. They will be notified by email.
          </p>
        </DialogHeader>

        <form onSubmit={reactivateForm.handleSubmit(onReactivate)} className="space-y-4 pt-2" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="vam-note">
              Note to vendor <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="vam-note"
              {...reactivateForm.register('reason')}
              placeholder="e.g. Account reinstated after review. Welcome back!"
              rows={3}
            />
            {reactivateForm.formState.errors.reason && (
              <p className="text-destructive text-xs">{reactivateForm.formState.errors.reason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">This note will be included in the reactivation email.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={setActive.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={setActive.isPending}>
              {setActive.isPending ? <><Spinner size="sm" className="mr-2" />Reactivating...</> : 'Reactivate vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

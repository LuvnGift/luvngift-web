'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateVendor, useUpdateVendor, VendorInput } from '@/hooks/use-admin';
import type { Vendor } from '@luvngift/shared';

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email'),
  phone: z.string().trim().min(7, 'Phone is required').max(20),
  address: z.string().trim().min(5, 'Address is required').max(200),
  state: z.string().trim().min(2, 'State is required').max(100),
  businessType: z.enum(['RETAIL', 'DELIVERY', 'LOGISTICS']),
  notes: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor | null;
}

export default function VendorFormModal({ open, onClose, vendor }: Props) {
  const isEdit = !!vendor;
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      state: '',
      businessType: 'RETAIL',
      notes: '',
    },
  });

  useEffect(() => {
    if (vendor) {
      reset({
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        address: vendor.address,
        state: vendor.state,
        businessType: vendor.businessType,
        notes: vendor.notes ?? '',
      });
    } else {
      reset({ name: '', email: '', phone: '', address: '', state: '', businessType: 'RETAIL', notes: '' });
    }
  }, [vendor, reset]);

  const onSubmit = async (values: FormValues) => {
    const data: VendorInput = {
      ...values,
      notes: values.notes || undefined,
    };
    if (isEdit && vendor) {
      await update.mutateAsync({ id: vendor.id, ...data });
    } else {
      await create.mutateAsync(data);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} placeholder="Vendor or company name" />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessType">Business type</Label>
              <Select
                value={watch('businessType')}
                onValueChange={(v) => setValue('businessType', v as FormValues['businessType'])}
              >
                <SelectTrigger id="businessType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETAIL">Retail</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="LOGISTICS">Logistics</SelectItem>
                </SelectContent>
              </Select>
              {errors.businessType && <p className="text-destructive text-xs">{errors.businessType.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} placeholder="vendor@email.com" />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} placeholder="+234 801 234 5678" />
              {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register('state')} placeholder="Lagos" />
              {errors.state && <p className="text-destructive text-xs">{errors.state.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} placeholder="Street address" />
            {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Any additional notes..." rows={2} />
            {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Add vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, User, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCreateVendor, useUpdateVendor, VendorInput } from '@/hooks/use-admin';
import type { Vendor } from '@luvngift/shared';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

const BUSINESS_TYPES = [
  { value: 'RETAIL', label: 'Retail — supplies goods / products' },
  { value: 'DELIVERY', label: 'Delivery — delivers to recipients' },
  { value: 'LOGISTICS', label: 'Logistics — sourcing & fulfilment' },
] as const;

const NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-\s]+$/;

const schema = z.object({
  name: z.string().trim().min(2, 'Business name is required').max(100),
  firstName: z.string().trim().min(1, 'First name is required').max(50).regex(NAME_RE, 'Letters only'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50).regex(NAME_RE, 'Letters only'),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().regex(/^\d{11}$/, 'Enter a valid 11-digit number'),
  address: z.string().trim().min(5, 'Address is required').max(200),
  state: z.string().min(2, 'Please select a state'),
  businessType: z.enum(['RETAIL', 'DELIVERY', 'LOGISTICS']),
  notes: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

function formatPhone(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function SectionHeading({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </span>
      <h3 className="text-sm font-semibold">{children}</h3>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  vendor?: (Vendor & { contactName?: string | null; status?: string }) | null;
}

export default function VendorFormModal({ open, onClose, vendor }: Props) {
  const isEdit = !!vendor;
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      firstName: '',
      lastName: '',
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
      const [first = '', ...rest] = (vendor.contactName ?? '').split(' ');
      reset({
        name: vendor.name,
        firstName: first,
        lastName: rest.join(' '),
        email: vendor.email,
        phone: (vendor.phone ?? '').replace(/\D/g, '').slice(0, 11),
        address: vendor.address,
        state: vendor.state,
        businessType: vendor.businessType as FormValues['businessType'],
        notes: vendor.notes ?? '',
      });
    } else {
      reset({
        name: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        state: '',
        businessType: 'RETAIL',
        notes: '',
      });
    }
  }, [vendor, open, reset]);

  const onSubmit = async (values: FormValues) => {
    const data: VendorInput = {
      name: values.name,
      contactName: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
      email: values.email,
      phone: values.phone,
      address: values.address,
      state: values.state,
      businessType: values.businessType,
      notes: values.notes || undefined,
    };
    try {
      if (isEdit && vendor) {
        await update.mutateAsync({ id: vendor.id, ...data });
      } else {
        await create.mutateAsync(data);
      }
      onClose();
    } catch {
      // errors handled in mutation hooks via toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit vendor' : 'Add vendor'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update vendor details below.'
              : 'Admin-created vendors are immediately approved and active.'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2" noValidate>
          {/* Business */}
          <div className="space-y-4">
            <SectionHeading icon={Building2}>Business details</SectionHeading>

            <div className="space-y-1.5">
              <Label htmlFor="vf-name">Business name</Label>
              <Input id="vf-name" {...register('name')} placeholder="e.g. Lagos Gift Hub" />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Controller
                  control={control}
                  name="state"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {NIGERIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.state && <p className="text-destructive text-xs">{errors.state.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Business type</Label>
                <Controller
                  control={control}
                  name="businessType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.businessType && <p className="text-destructive text-xs">{errors.businessType.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vf-address">Business address</Label>
              <Input id="vf-address" {...register('address')} placeholder="Street, area" />
              {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 border-t pt-4">
            <SectionHeading icon={User}>Contact person</SectionHeading>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vf-firstName">First name</Label>
                <Input id="vf-firstName" {...register('firstName')} placeholder="First name" />
                {errors.firstName && <p className="text-destructive text-xs">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vf-lastName">Last name</Label>
                <Input id="vf-lastName" {...register('lastName')} placeholder="Last name" />
                {errors.lastName && <p className="text-destructive text-xs">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vf-email">Email</Label>
                <Input id="vf-email" type="email" {...register('email')} placeholder="vendor@email.com" />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="vf-phone">Phone</Label>
                    <Input
                      id="vf-phone"
                      inputMode="numeric"
                      placeholder="080-1234-5678"
                      value={formatPhone(field.value ?? '')}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    />
                    {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
                  </div>
                )}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4 border-t pt-4">
            <SectionHeading icon={FileText}>Additional info</SectionHeading>
            <div className="space-y-1.5">
              <Label htmlFor="vf-notes">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="vf-notes"
                {...register('notes')}
                placeholder="Capacity, service area, specialisations..."
                rows={3}
              />
              {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? <><Spinner size="sm" className="mr-2" />Saving...</>
                : isEdit ? 'Save changes' : 'Add vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

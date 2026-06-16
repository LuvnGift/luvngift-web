'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { useApplyVendor } from '@/hooks/use-vendor-apply';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

const BUSINESS_TYPES = [
  { value: 'RETAIL', label: 'Retail — I supply goods / products' },
  { value: 'DELIVERY', label: 'Delivery — I deliver to recipients' },
  { value: 'LOGISTICS', label: 'Logistics — I handle sourcing & fulfilment' },
] as const;

const schema = z.object({
  name: z.string().trim().min(2, 'Business name is required').max(100),
  contactName: z.string().trim().min(2, 'Your name is required').max(100),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-(). ]{7,20}$/, 'Enter a valid phone number'),
  address: z.string().trim().min(5, 'Business address is required').max(200),
  state: z.string().min(2, 'Please select a state'),
  businessType: z.enum(['RETAIL', 'DELIVERY', 'LOGISTICS'], {
    errorMap: () => ({ message: 'Please select a business type' }),
  }),
  notes: z.string().trim().max(1000).optional(),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Vendor Agreement' }),
  }),
  // Honeypot — hidden; must stay empty.
  companyWebsite: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export function VendorApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const { mutateAsync, isPending } = useApplyVendor();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { companyWebsite: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await mutateAsync(values);
      setSubmitted(true);
    } catch {
      // error toast handled in the hook
    }
  };

  if (submitted) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-bold">Application received!</h2>
          <p className="text-muted-foreground">
            Thanks for your interest in partnering with Luvngift. Our team will review your application
            and get back to you, usually within 2–3 business days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Lagos Gift Hub" />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contactName">Your name</Label>
              <Input id="contactName" {...register('contactName')} placeholder="Full name" />
              {errors.contactName && <p className="text-destructive text-xs">{errors.contactName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} placeholder="+234 801 234 5678" inputMode="tel" />
              {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} placeholder="you@business.com" />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Business address</Label>
            <Input id="address" {...register('address')} placeholder="Street, area" />
            {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                      <SelectValue placeholder="Select type" />
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
            <Label htmlFor="notes">Tell us about your business</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={4}
              placeholder="What you offer, your capacity, areas you cover, website or social links, etc."
            />
            {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
          </div>

          {/* Honeypot — visually hidden, not announced to screen readers. */}
          <div aria-hidden="true" className="hidden">
            <label htmlFor="companyWebsite">Company website</label>
            <input id="companyWebsite" tabIndex={-1} autoComplete="off" {...register('companyWebsite')} />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                {...register('agreedToTerms')}
              />
              <span className="text-muted-foreground">
                I have read and agree to the{' '}
                <Link href="/vendor-agreement" target="_blank" className="font-medium text-foreground underline underline-offset-2">
                  Vendor Agreement
                </Link>
                .
              </span>
            </label>
            {errors.agreedToTerms && <p className="text-destructive text-xs">{errors.agreedToTerms.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <><Spinner size="sm" className="mr-2" />Submitting...</> : 'Submit application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

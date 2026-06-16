'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Building2, User, FileText } from 'lucide-react';
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

const NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-\s]+$/;

const schema = z.object({
  name: z.string().trim().min(2, 'Business name is required').max(100),
  firstName: z.string().trim().min(1, 'First name is required').max(50).regex(NAME_RE, 'Letters only'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50).regex(NAME_RE, 'Letters only'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().regex(/^\d{11}$/, 'Enter a valid 11-digit phone number'),
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

/** Display 11 digits as 080-1234-5678 while keeping the raw value as digits. */
function formatPhone(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function SectionHeading({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </span>
      <h3 className="text-sm font-semibold">{children}</h3>
    </div>
  );
}

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
      await mutateAsync({
        name: values.name,
        contactName: `${values.firstName.trim()} ${values.lastName.trim()}`,
        email: values.email,
        phone: values.phone,
        address: values.address,
        state: values.state,
        businessType: values.businessType,
        notes: values.notes,
        agreedToTerms: true,
      });
      setSubmitted(true);
    } catch {
      // error toast handled in the hook
    }
  };

  if (submitted) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Application received!</h2>
          <p className="max-w-md text-muted-foreground">
            Thanks for your interest in selling with Luvngift. Our team will review your application and get
            back to you, usually within 2–3 business days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
          {/* Business */}
          <div className="space-y-4">
            <SectionHeading icon={Building2}>Your business</SectionHeading>
            <div className="space-y-1.5">
              <Label htmlFor="name">Business name</Label>
              <Input id="name" {...register('name')} placeholder="e.g. Lagos Gift Hub" />
              {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Controller
                  control={control}
                  name="state"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger onBlur={field.onBlur}>
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
                      <SelectTrigger onBlur={field.onBlur}>
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
              <Label htmlFor="address">Business address</Label>
              <Input id="address" {...register('address')} placeholder="Street, area" />
              {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 border-t pt-6">
            <SectionHeading icon={User}>Contact details</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...register('firstName')} placeholder="First name" />
                {errors.firstName && <p className="text-destructive text-xs">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...register('lastName')} placeholder="Last name" />
                {errors.lastName && <p className="text-destructive text-xs">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="you@business.com" />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
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

          {/* About */}
          <div className="space-y-4 border-t pt-6">
            <SectionHeading icon={FileText}>About your business</SectionHeading>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Tell us what you offer</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                rows={4}
                placeholder="What you supply or deliver, your capacity, areas you cover, website or social links, etc."
              />
              {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
            </div>
          </div>

          {/* Honeypot — visually hidden, not announced to screen readers. */}
          <div aria-hidden="true" className="hidden">
            <label htmlFor="companyWebsite">Company website</label>
            <input id="companyWebsite" tabIndex={-1} autoComplete="off" {...register('companyWebsite')} />
          </div>

          <div className="space-y-3 border-t pt-6">
            <label className="flex items-start gap-2.5 text-sm">
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
                , including the revenue share and payout terms.
              </span>
            </label>
            {errors.agreedToTerms && <p className="text-destructive text-xs">{errors.agreedToTerms.message}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              {isPending ? <><Spinner size="sm" className="mr-2" />Submitting...</> : 'Submit application'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

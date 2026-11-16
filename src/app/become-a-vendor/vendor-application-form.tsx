'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Building2, User, FileText, MapPin } from 'lucide-react';
import { useApplyVendor } from '@/hooks/use-vendor-apply';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { NIGERIAN_STATES, applyPartnerSchema } from '@luvngift/shared';
import { toast } from 'sonner';

const NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-\s]+$/;

const schema = z.object({
  name: z.string().trim().min(2, 'Business name is required').max(100),
  firstName: z.string().trim().min(1, 'First name is required').max(50).regex(NAME_RE, 'Letters only'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50).regex(NAME_RE, 'Letters only'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().regex(/^\d{11}$/, 'Enter a valid 11-digit phone number'),
  address: z.string().trim().min(5, 'Business address is required').max(200),
  state: z.string().min(2, 'Please select a state'),
  // Format-checked by applyPartnerSchema (shared) before sending.
  cacNumber: z.string().trim().max(20).optional(),
  portfolioUrl: z.string().trim().max(300).optional(),
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
  const [coverage, setCoverage] = useState<string[]>([]);
  const [coverageError, setCoverageError] = useState<string | null>(null);
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

  const toggleState = (state: string) =>
    setCoverage((c) => (c.includes(state) ? c.filter((s) => s !== state) : [...c, state]));

  const onSubmit = async (values: FormValues) => {
    if (!coverage.length) {
      setCoverageError('Choose at least one state you deliver to');
      return;
    }
    setCoverageError(null);
    const data = {
      name: values.name,
      contactName: `${values.firstName.trim()} ${values.lastName.trim()}`,
      email: values.email,
      phone: values.phone,
      address: values.address,
      state: values.state,
      cacNumber: values.cacNumber || undefined,
      portfolioUrl: values.portfolioUrl || undefined,
      notes: values.notes || undefined,
      coverage,
      agreedToTerms: true as const,
    };
    // The API validates with this exact schema: check before sending, so a gap
    // between this form and the API is a clear message here, not an opaque 400.
    const checked = applyPartnerSchema.safeParse(data);
    if (!checked.success) {
      toast.error(checked.error.errors[0]?.message ?? 'Please check the form');
      return;
    }
    try {
      await mutateAsync(checked.data);
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
            Thanks for your interest in partnering with Luvngift. Our team will review your application and get
            back to you, usually within 2–3 business days. If it looks like a fit, we will visit, talk it through
            with you, and ask you to make a sample hamper in our packaging.
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
                      <SelectTrigger aria-label="State" onBlur={field.onBlur}>
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
                <Label htmlFor="cacNumber">CAC number <span className="font-normal text-muted-foreground">(if registered)</span></Label>
                <Input id="cacNumber" {...register('cacNumber')} placeholder="e.g. RC123456 or BN1234567" />
                {errors.cacNumber && <p className="text-destructive text-xs">{errors.cacNumber.message}</p>}
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
              <Label htmlFor="portfolioUrl">Where can we see your hampers?</Label>
              <Input id="portfolioUrl" inputMode="url" {...register('portfolioUrl')} placeholder="https://instagram.com/yourbusiness" />
              <p className="text-xs text-muted-foreground">Your Instagram, website or catalogue. Optional, but it helps us review faster.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Tell us what you offer</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                rows={4}
                placeholder="The hampers and gifts you make, how many orders a week you can take, how you deliver."
              />
              {errors.notes && <p className="text-destructive text-xs">{errors.notes.message}</p>}
            </div>
          </div>

          {/* Coverage */}
          <div className="space-y-4 border-t pt-6">
            <SectionHeading icon={MapPin}>Where you deliver</SectionHeading>
            <p className="text-sm text-muted-foreground">
              Choose every state you can deliver to. We send you orders for recipients in these states.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {NIGERIAN_STATES.map((state) => (
                <label key={state} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={coverage.includes(state)}
                    onChange={() => toggleState(state)}
                  />
                  {state}
                </label>
              ))}
            </div>
            {coverageError && <p className="text-destructive text-xs">{coverageError}</p>}
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
                , including how partners are paid.
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

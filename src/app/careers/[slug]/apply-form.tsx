'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { useApplyToJob } from '@/hooks/use-careers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-\s]+$/;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50).regex(NAME_RE, 'Letters only'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50).regex(NAME_RE, 'Letters only'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  coverLetter: z.string().trim().max(5000).optional().or(z.literal('')),
  resume: z
    .custom<FileList>((v) => typeof FileList !== 'undefined' && v instanceof FileList && v.length > 0, 'Please attach your résumé')
    .refine((files) => files?.[0] && files[0].size <= MAX_RESUME_BYTES, 'Résumé must be 5MB or smaller')
    .refine((files) => files?.[0] && ACCEPTED.includes(files[0].type), 'Résumé must be a PDF or Word document'),
  // Honeypot — hidden; must stay empty.
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

export function ApplyForm({ jobId }: { jobId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const { mutateAsync, isPending } = useApplyToJob(jobId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { website: '' } });

  const onSubmit = async (values: FormValues) => {
    if (values.website) return; // honeypot tripped
    const fd = new FormData();
    fd.append('firstName', values.firstName);
    fd.append('lastName', values.lastName);
    fd.append('email', values.email);
    if (values.phone) fd.append('phone', values.phone);
    if (values.coverLetter) fd.append('coverLetter', values.coverLetter);
    fd.append('resume', values.resume[0]);
    try {
      await mutateAsync(fd);
      setSubmitted(true);
    } catch {
      // error toast handled in the hook
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Application received!</h2>
          <p className="max-w-md text-muted-foreground">
            Thanks for applying. We&apos;ve emailed you a confirmation and our team will be in touch if
            there&apos;s a good fit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register('firstName')} placeholder="First name" />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register('lastName')} placeholder="Last name" />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="you@example.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" {...register('phone')} placeholder="+1 555 000 0000" />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resume">Résumé (PDF or Word, max 5MB)</Label>
            <Input id="resume" type="file" accept=".pdf,.doc,.docx" {...register('resume')} />
            {errors.resume && <p className="text-xs text-destructive">{errors.resume.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coverLetter">Cover letter (optional)</Label>
            <Textarea id="coverLetter" rows={5} {...register('coverLetter')} placeholder="Tell us why you'd be a great fit." />
            {errors.coverLetter && <p className="text-xs text-destructive">{errors.coverLetter.message}</p>}
          </div>

          {/* Honeypot */}
          <div aria-hidden="true" className="hidden">
            <input tabIndex={-1} autoComplete="off" {...register('website')} />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? <><Spinner size="sm" className="mr-2" />Submitting...</> : 'Submit application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

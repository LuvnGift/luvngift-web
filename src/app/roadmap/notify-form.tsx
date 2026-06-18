'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, Check } from 'lucide-react';
import { useSubscribeRoadmap } from '@/hooks/use-roadmap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  // Honeypot — hidden; must stay empty.
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;

/** Per-item waitlist signup. `itemId` is the roadmap item to notify about. */
export function NotifyForm({ itemId }: { itemId: string }) {
  const [done, setDone] = useState(false);
  const { mutateAsync, isPending } = useSubscribeRoadmap();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { website: '' } });

  const onSubmit = async (values: FormValues) => {
    if (values.website) return; // honeypot tripped
    try {
      await mutateAsync({ id: itemId, email: values.email });
      setDone(true);
    } catch {
      // error toast handled in the hook
    }
  };

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <Check className="h-4 w-4" /> You&apos;re on the list — we&apos;ll email you when it launches.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 sm:flex-row" noValidate>
      <div className="flex-1">
        <Input type="email" placeholder="you@example.com" aria-label="Email address" {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div aria-hidden="true" className="hidden">
        <input tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>
      <Button type="submit" disabled={isPending} className="shrink-0">
        {isPending ? <Spinner size="sm" className="mr-2" /> : <Bell className="mr-2 h-4 w-4" />}
        Notify me
      </Button>
    </form>
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { passwordSchema } from '@luvngift/shared';

const schema = z.object({
  // The API's rule (passwordSchema in @luvngift/shared): a weaker one let a
  // password through here that the API then refused.
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/api/v1/auth/reset-password', { token, password: data.password });
      toast.success('Password updated. Please sign in.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Reset failed. The link may have expired.');
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <p className="text-destructive font-medium">Invalid reset link.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" {...register('password')} type="password" placeholder="Min. 8 characters" />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" {...register('confirmPassword')} type="password" placeholder="Repeat password" />
            {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardContent className="flex justify-center py-12">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}

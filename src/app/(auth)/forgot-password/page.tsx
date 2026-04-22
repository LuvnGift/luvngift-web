'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsPending(true);
    try {
      await api.post('/api/v1/auth/forgot-password', data);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          {sent
            ? 'Check your inbox for a reset link.'
            : 'Enter your email and we\'ll send a password reset link.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register('email')} type="email" placeholder="you@example.com" />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              If an account exists with that email, you'll receive a reset link shortly.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
              Try a different email
            </Button>
          </div>
        )}
        <Link
          href="/login"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}

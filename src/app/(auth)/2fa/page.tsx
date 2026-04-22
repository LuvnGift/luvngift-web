'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { verify2FASchema, Verify2FAInput } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TwoFactorPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [tempToken, setTempToken] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Verify2FAInput>({
    resolver: zodResolver(verify2FASchema),
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('2fa-temp-token');
    if (!stored) {
      router.replace('/login');
      return;
    }
    setTempToken(stored);
  }, [router]);

  const onSubmit = async (data: Verify2FAInput) => {
    if (!tempToken) return;
    try {
      const res = await api.post('/api/v1/auth/2fa/verify-login', {
        tempToken,
        token: data.token,
      });
      sessionStorage.removeItem('2fa-temp-token');
      const { user } = res.data.data;
      setUser(user);

      // Connect socket via API
      api.get('/api/v1/auth/socket-token')
        .then((r) => connectSocket(r.data.data.token))
        .catch(() => {});

      const defaultRoute = user?.role === 'ADMIN' ? '/admin' : '/';
      router.push(defaultRoute);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Invalid code. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="token">Authentication code</Label>
            <Input
              id="token"
              {...register('token')}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="text-center text-2xl tracking-widest"
            />
            {errors.token && <p className="text-destructive text-xs">{errors.token.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || !tempToken}>
            {isSubmitting ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

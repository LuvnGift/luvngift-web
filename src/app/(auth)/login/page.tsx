'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@celebrate4me/shared';
import { useLogin } from '@/hooks/use-auth';
import Link from 'next/link';

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border">
        <h1 className="text-2xl font-bold text-center">Sign in</h1>
        <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input {...register('email')} type="email" className="w-full mt-1 px-3 py-2 border rounded-md" />
            {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input {...register('password')} type="password" className="w-full mt-1 px-3 py-2 border rounded-md" />
            {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isPending} className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium">
            {isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm">
          No account? <Link href="/register" className="underline">Register</Link>
        </p>
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="underline">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}

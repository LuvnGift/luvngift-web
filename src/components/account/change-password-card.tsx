'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { changePasswordSchema } from '@luvngift/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const passwordSchema = changePasswordSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

const FIELDS = [
  { name: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'New password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
] as const;

/** Change the signed-in user's password. Shared by /account and /admin/profile. */
export function ChangePasswordCard() {
  const form = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (data: PasswordForm) => {
    try {
      await api.post('/api/v1/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed.');
      form.reset();
    } catch (err) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      toast.error(message ?? 'Failed to change password.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Update your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                {...form.register(field.name)}
                type="password"
                autoComplete={field.autoComplete}
              />
              {errors[field.name] && (
                <p className="text-destructive text-xs">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

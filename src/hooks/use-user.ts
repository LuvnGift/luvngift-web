'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { UpdateProfileInput, UpdateLocationInput } from '@luvngift/shared';
import { toast } from 'sonner';

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  return useMutation<any, Error, UpdateProfileInput>({
    mutationFn: (data) => api.patch('/api/v1/users/me', data).then((r) => r.data.data),
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Update failed.'),
  });
};

export const useSetLocation = (options?: { redirectTo?: string }) => {
  const qc = useQueryClient();
  const router = useRouter();
  const { setUser } = useAuthStore();
  return useMutation<any, Error, UpdateLocationInput>({
    mutationFn: (data) => api.patch('/api/v1/users/me', data).then((r) => r.data.data),
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ['me'] });
      if (options?.redirectTo) {
        router.push(options.redirectTo);
        return;
      }
      // Only when staying on the page. Saving the billing address from the
      // account page gave no feedback at all, so the only way to tell it had
      // worked was to reload — and the address decides whether tax is charged.
      // During onboarding the redirect is the feedback, so a toast there would
      // just flash as the page changes.
      toast.success('Your changes have been saved.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to save location.'),
  });
};

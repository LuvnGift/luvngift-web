'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export const useSubscribeRoadmap = () =>
  useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      api.post(`/api/v1/roadmap/${id}/subscribe`, { email }).then((r) => r.data),
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'),
  });

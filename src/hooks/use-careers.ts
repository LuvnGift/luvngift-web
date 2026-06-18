'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/** Submit a job application as multipart/form-data (includes the résumé file). */
export const useApplyToJob = (jobId: string) =>
  useMutation({
    mutationFn: (form: FormData) =>
      api.post(`/api/v1/jobs/${jobId}/apply`, form).then((r) => r.data.data),
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'),
  });

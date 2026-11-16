'use client';

import { useMutation } from '@tanstack/react-query';
import type { ApplyPartnerInput } from '@luvngift/shared';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/** The wire shape is the shared schema's (applyPartnerSchema), which the API validates with. */
export type VendorApplicationPayload = ApplyPartnerInput;

export const useApplyVendor = () =>
  useMutation({
    mutationFn: (data: VendorApplicationPayload) => api.post('/api/v1/vendors/apply', data).then((r) => r.data.data),
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'),
  });

'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface VendorApplicationPayload {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  businessType: 'RETAIL' | 'DELIVERY' | 'LOGISTICS';
  notes?: string;
  agreedToTerms: true;
  /** Honeypot — always empty for real users. */
  companyWebsite?: string;
}

export const useApplyVendor = () =>
  useMutation({
    mutationFn: (data: VendorApplicationPayload) =>
      api.post('/api/v1/vendors/apply', data).then((r) => r.data.data),
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'),
  });

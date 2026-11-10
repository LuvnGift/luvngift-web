'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export type PartnerRole = 'SOURCING' | 'AGENT' | 'DELIVERY';

interface Person {
  name: string;
  phone: string;
  relationship: string;
}

export interface VendorApplicationPayload {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  businessType: 'RETAIL' | 'DELIVERY' | 'LOGISTICS' | 'AGENT';
  notes?: string;
  /** Agents only: vetting details. The API keeps only the ID number's last four. */
  idType?: 'NIN' | 'PASSPORT' | 'DRIVERS_LICENCE' | 'VOTERS_CARD';
  idNumber?: string;
  guarantor?: Person;
  references?: Person[];
  transport?: string;
  coverage?: { state: string; role: PartnerRole }[];
  agreedToTerms: true;
  /** Honeypot — always empty for real users. */
  companyWebsite?: string;
}

/**
 * With an ID document the application goes as multipart: the file plus the
 * form as one JSON field (the API parses it back before validating).
 */
export const useApplyVendor = () =>
  useMutation({
    mutationFn: ({ data, idDocument }: { data: VendorApplicationPayload; idDocument?: File | null }) => {
      if (!idDocument) return api.post('/api/v1/vendors/apply', data).then((r) => r.data.data);
      const form = new FormData();
      form.append('application', JSON.stringify(data));
      form.append('idDocument', idDocument);
      return api.post('/api/v1/vendors/apply', form, { timeout: 90_000 }).then((r) => r.data.data);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'),
  });

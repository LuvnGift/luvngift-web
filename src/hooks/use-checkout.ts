'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CreatePaymentIntentInput {
  orderId: string;
}

interface PaymentIntentResult {
  clientSecret: string;
  customerId: string;
}

export const useCreatePaymentIntent = () =>
  useMutation<PaymentIntentResult, Error, CreatePaymentIntentInput>({
    mutationFn: (data) => api.post('/api/v1/payments/create-intent', data).then((r) => r.data.data),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Payment setup failed.'),
  });

/**
 * The customer session that lets the Payment Element show saved cards and its
 * save box (see `components/checkout/checkout-elements.tsx`). One per intent,
 * fetched once: Elements reads it only at mount, so a refetch would do nothing.
 * Resolves to undefined on failure, so checkout falls back to a plain card form.
 */
export const useCustomerSession = (clientSecret: string) =>
  useQuery<string | undefined>({
    queryKey: ['customer-session', clientSecret],
    queryFn: async () => {
      try {
        const res = await api.post('/api/v1/payments/customer-session', {});
        return res.data.data.customerSessionClientSecret as string;
      } catch {
        return undefined;
      }
    },
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

export const useVerifyPayment = () =>
  useMutation<void, Error, { orderId: string }>({
    mutationFn: (data) => api.post('/api/v1/payments/verify', data).then((r) => r.data),
    onError: () => {}, // silent — webhook will catch it if verify fails
  });

// ─── Saved cards ──────────────────────────────────────────────────────────────

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const SAVED_CARDS_KEY = ['payment-methods'];

export const useSavedCards = (enabled = true) =>
  useQuery<SavedCard[]>({
    queryKey: SAVED_CARDS_KEY,
    queryFn: () => api.get('/api/v1/payments/payment-methods').then((r) => r.data.data),
    enabled,
  });

export const useDeleteSavedCard = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/api/v1/payments/payment-methods/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SAVED_CARDS_KEY });
      toast.success('Card removed');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Couldn't remove that card."),
  });
};

export const useSetDefaultCard = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      api.post(`/api/v1/payments/payment-methods/${id}/default`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SAVED_CARDS_KEY });
      toast.success('Default card updated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Couldn't update your default card."),
  });
};

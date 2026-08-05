'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CreatePaymentIntentInput {
  orderId: string;
  savePaymentMethod?: boolean;
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
 * Toggles card saving on an intent that already exists. `setup_future_usage` is
 * fixed at creation, so the checkbox next to the card form has to go through here.
 */
export const useSetSaveCard = () =>
  useMutation<void, Error, { orderId: string; savePaymentMethod: boolean }>({
    mutationFn: (data) => api.post('/api/v1/payments/save-card', data).then((r) => r.data),
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Couldn't update your card preference."),
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

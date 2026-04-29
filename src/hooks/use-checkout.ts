'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CreatePaymentIntentInput {
  orderId: string;
}

interface PaymentIntentResult {
  clientSecret: string;
}

export const useCreatePaymentIntent = () =>
  useMutation<PaymentIntentResult, Error, CreatePaymentIntentInput>({
    mutationFn: (data) => api.post('/api/v1/payments/create-intent', data).then((r) => r.data.data),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Payment setup failed.'),
  });

export const useVerifyPayment = () =>
  useMutation<void, Error, { orderId: string }>({
    mutationFn: (data) => api.post('/api/v1/payments/verify', data).then((r) => r.data),
    onError: () => {}, // silent — webhook will catch it if verify fails
  });

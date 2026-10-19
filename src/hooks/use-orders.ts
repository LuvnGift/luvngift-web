'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Order, PaginatedResponse, CreateOrderInput, CustomOrderInput } from '@luvngift/shared';
import { toast } from 'sonner';
import type { OrderConversation, QuoteAction } from '@/lib/custom-orders';

export const useMyOrders = (page = 1) =>
  useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', page],
    queryFn: () => api.get('/api/v1/orders', { params: { page, limit: 10 } }).then((r) => r.data.data),
  });

export const useOrder = (id: string) =>
  useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: () => api.get(`/api/v1/orders/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation<Order, Error, CreateOrderInput>({
    mutationFn: (data) => api.post('/api/v1/orders', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to create order.'),
  });
};

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation<Order, Error, { orderId: string; recipientName: string; recipientPhone: string; deliveryAddress: { street: string; city: string; state: string; country: string }; personalMessage?: string }>({
    mutationFn: ({ orderId, ...data }) => api.patch(`/api/v1/orders/${orderId}/recipient`, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to update order.'),
  });
};

export const useCreateCustomOrder = () => {
  const qc = useQueryClient();
  // deliveryStreet is part of customOrderSchema from @luvngift/shared >= 1.4.0;
  // intersect it so this compiles before the updated package is installed here.
  return useMutation<Order, Error, CustomOrderInput & { deliveryStreet?: string }>({
    mutationFn: (data) => api.post('/api/v1/orders/custom', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to submit request.'),
  });
};

// ─── Custom gift request conversation ────────────────────────────────────────

const errorMessage = (err: any, fallback: string): string =>
  err?.response?.data?.error?.message ?? fallback;

export const useOrderConversation = (orderId: string, enabled = true) =>
  useQuery<OrderConversation>({
    queryKey: ['orders', orderId, 'conversation'],
    queryFn: () => api.get(`/api/v1/orders/${orderId}/conversation`).then((r) => r.data.data),
    enabled: !!orderId && enabled,
  });

export const useSendOrderMessage = (orderId: string) => {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (body) =>
      api.post(`/api/v1/orders/${orderId}/messages`, { body }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders', orderId, 'conversation'] }),
    onError: (err) => toast.error(errorMessage(err, 'Your message could not be sent.')),
  });
};

export const useRespondToQuote = (orderId: string) => {
  const qc = useQueryClient();
  return useMutation<
    OrderConversation,
    Error,
    { round: number; action: QuoteAction; comment?: string }
  >({
    mutationFn: ({ round, ...body }) =>
      api
        .post(`/api/v1/orders/${orderId}/quotes/${round}/respond`, body)
        .then((r) => r.data.data),
    // The order's price and status change too, so refresh everything for it.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
    onError: (err) => {
      toast.error(errorMessage(err, 'We could not record your answer.'));
      // A 409 means the quote changed under the customer — show them the new one.
      qc.invalidateQueries({ queryKey: ['orders', orderId, 'conversation'] });
    },
  });
};

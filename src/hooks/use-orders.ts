'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Order, PaginatedResponse, CreateOrderInput, CustomOrderInput } from '@luvngift/shared';
import { toast } from 'sonner';

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

export const useCreateCustomOrder = () => {
  const qc = useQueryClient();
  return useMutation<Order, Error, CustomOrderInput>({
    mutationFn: (data) => api.post('/api/v1/orders/custom', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to submit request.'),
  });
};

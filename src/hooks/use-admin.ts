'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ---------- Metrics ----------
export const useAdminMetrics = () =>
  useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => api.get('/api/v1/admin/metrics').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

// ---------- Orders ----------
export const useAdminOrders = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ['admin', 'orders', page, limit],
    queryFn: () =>
      api.get('/api/v1/admin/orders', { params: { page, limit } }).then((r) => r.data.data),
  });

export const useAdminOrder = (id: string | null) =>
  useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: () => api.get(`/api/v1/admin/orders/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/orders/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      toast.success('Order deleted');
    },
    onError: () => toast.error('Failed to delete order'),
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) =>
      api.patch(`/api/v1/admin/orders/${id}/status`, { status, adminNotes }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      toast.success('Order status updated');
    },
  });
};

export const useRefundOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/v1/admin/orders/${id}/refund`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      toast.success('Refund processed');
    },
  });
};

// ---------- Users ----------
export const useAdminUsers = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ['admin', 'users', page, limit],
    queryFn: () =>
      api.get('/api/v1/admin/users', { params: { page, limit } }).then((r) => r.data.data),
  });

export const useDeactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/v1/admin/users/${id}/deactivate`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User deactivated');
    },
  });
};

// ---------- Chat support ----------
export const useEscalatedSessions = () =>
  useQuery({
    queryKey: ['admin', 'chat', 'sessions'],
    queryFn: () => api.get('/api/v1/admin/chat/sessions').then((r) => r.data.data),
    refetchInterval: 15_000,
  });

export const useReplyToSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.post(`/api/v1/admin/chat/sessions/${id}/reply`, { content }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'chat', 'sessions'] });
    },
  });
};

export const useResolveSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/v1/admin/chat/sessions/${id}/resolve`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'chat', 'sessions'] });
      toast.success('Session resolved');
    },
  });
};

// ---------- Occasions ----------
export const useAdminOccasions = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ['admin', 'occasions', page, limit],
    queryFn: () =>
      api.get('/api/v1/admin/occasions', { params: { page, limit } }).then((r) => r.data.data),
  });

export const useAllOccasions = () =>
  useQuery({
    queryKey: ['admin', 'occasions', 'all'],
    queryFn: () =>
      api.get('/api/v1/occasions').then((r) => r.data.data),
  });

export const useCreateOccasion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description: string; image?: string }) =>
      api.post('/api/v1/admin/occasions', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'occasions'] });
      qc.invalidateQueries({ queryKey: ['occasions'] });
      toast.success('Occasion created');
    },
  });
};

export const useUpdateOccasion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; image?: string; isActive?: boolean }) =>
      api.patch(`/api/v1/admin/occasions/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'occasions'] });
      qc.invalidateQueries({ queryKey: ['occasions'] });
      toast.success('Occasion updated');
    },
  });
};

export const useDeleteOccasion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/admin/occasions/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'occasions'] });
      qc.invalidateQueries({ queryKey: ['occasions'] });
      toast.success('Occasion deleted');
    },
  });
};

// ---------- Bundles ----------
export const useAdminBundles = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ['admin', 'bundles', page, limit],
    queryFn: () =>
      api.get('/api/v1/admin/bundles', { params: { page, limit } }).then((r) => r.data.data),
  });

export const useCreateBundle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      occasionId: string;
      name: string;
      description: string;
      price: number;
      currency: 'CAD' | 'USD' | 'GBP';
      estimatedDeliveryDays: number;
      images: string[];
      items: { name: string; description?: string; quantity: number }[];
    }) => api.post('/api/v1/admin/bundles', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bundles'] });
      toast.success('Bundle created');
    },
  });
};

export const useUpdateBundle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      occasionId?: string;
      name?: string;
      description?: string;
      price?: number;
      currency?: 'CAD' | 'USD' | 'GBP';
      estimatedDeliveryDays?: number;
      images?: string[];
      items?: { name: string; description?: string; quantity: number }[];
      isActive?: boolean;
    }) => api.patch(`/api/v1/admin/bundles/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bundles'] });
      toast.success('Bundle updated');
    },
  });
};

export const useDeleteBundle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/admin/bundles/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bundles'] });
      toast.success('Bundle deleted');
    },
  });
};

// ---------- Reviews ----------
export const usePendingReviews = () =>
  useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: () => api.get('/api/v1/admin/reviews').then((r) => r.data.data),
  });

export const useModerateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isModerated, adminResponse }: { id: string; isModerated: boolean; adminResponse?: string }) =>
      api.patch(`/api/v1/admin/reviews/${id}/moderate`, { isModerated, adminResponse }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast.success('Review moderated');
    },
  });
};

// ---------- Exchange rate settings ----------
export interface ExchangeRateSettings {
  GBP: number;
  CAD: number;
  sources: { GBP: 'admin' | 'live'; CAD: 'admin' | 'live' };
}

export const useAdminExchangeRates = () =>
  useQuery<ExchangeRateSettings>({
    queryKey: ['admin', 'settings', 'exchange-rates'],
    queryFn: () => api.get('/api/v1/admin/settings/exchange-rates').then((r) => r.data.data),
  });

export const useUpdateExchangeRates = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rates: { GBP?: number | null; CAD?: number | null }) =>
      api.put('/api/v1/admin/settings/exchange-rates', rates).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings', 'exchange-rates'] });
      qc.invalidateQueries({ queryKey: ['exchange-rates'] });
      toast.success('Exchange rates updated');
    },
    onError: () => toast.error('Failed to update exchange rates'),
  });
};

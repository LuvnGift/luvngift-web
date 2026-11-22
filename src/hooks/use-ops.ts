'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateOpsNoteInput,
  OpsCoverageRow,
  OpsMe,
  OpsNote,
  OpsOrderDetail,
  OpsOrderSummary,
  OpsOrderView,
  OpsPartnerDetail,
  OpsPartnerRow,
  OpsQueue,
} from '@luvngift/shared';
import { api } from '@/lib/api';

/**
 * The ops dashboard (/ops) for STAFF and admins. Everything here reads
 * /api/v1/ops, which returns the ops view only: no money, no buyer, no bank
 * account numbers. Writes answer with the refreshed view.
 */

export interface Paged<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const errorMessage = (err: any, fallback: string) => err?.response?.data?.error?.message ?? fallback;
const get = <T>(url: string, params?: Record<string, unknown>) =>
  api.get(url, { params }).then((r) => r.data.data as T);

export const opsKeys = {
  me: ['ops', 'me'] as const,
  queue: ['ops', 'queue'] as const,
  orders: (p: object) => ['ops', 'orders', p] as const,
  order: (id: string) => ['ops', 'order', id] as const,
  partners: (p: object) => ['ops', 'partners', p] as const,
  partner: (id: string) => ['ops', 'partner', id] as const,
  coverage: ['ops', 'coverage'] as const,
  notes: (p: object) => ['ops', 'notes', p] as const,
};

export const useOpsMe = () =>
  useQuery<OpsMe>({ queryKey: opsKeys.me, queryFn: () => get('/api/v1/ops/me'), retry: false });

export const useOpsQueue = (enabled = true) =>
  useQuery<OpsQueue>({
    queryKey: opsKeys.queue,
    queryFn: () => get('/api/v1/ops/queue'),
    enabled,
    refetchInterval: 5 * 60 * 1000,
  });

export interface OpsOrderParams {
  page: number;
  view: OpsOrderView;
  state?: string;
  partnerId?: string;
  reference?: string;
}

export const useOpsOrders = (params: OpsOrderParams) =>
  useQuery<Paged<OpsOrderSummary>>({
    queryKey: opsKeys.orders(params),
    queryFn: () => get('/api/v1/ops/orders', { ...params, limit: 20 }),
    placeholderData: keepPreviousData,
  });

export const useOpsOrder = (id: string) =>
  useQuery<OpsOrderDetail>({ queryKey: opsKeys.order(id), queryFn: () => get(`/api/v1/ops/orders/${id}`) });

export interface OpsPartnerParams {
  page: number;
  search?: string;
  state?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const useOpsPartners = (params: OpsPartnerParams) =>
  useQuery<Paged<OpsPartnerRow>>({
    queryKey: opsKeys.partners(params),
    queryFn: () => get('/api/v1/ops/partners', { ...params, limit: 20 }),
    placeholderData: keepPreviousData,
  });

export const useOpsPartner = (id: string) =>
  useQuery<OpsPartnerDetail>({ queryKey: opsKeys.partner(id), queryFn: () => get(`/api/v1/ops/partners/${id}`) });

export const useOpsCoverage = () =>
  useQuery<OpsCoverageRow[]>({ queryKey: opsKeys.coverage, queryFn: () => get('/api/v1/ops/coverage') });

export interface OpsNoteParams {
  page: number;
  targetType?: 'ORDER' | 'PARTNER';
  targetId?: string;
  flagsOnly?: boolean;
  status?: 'OPEN' | 'RESOLVED';
}

export const useOpsNotes = (params: OpsNoteParams, enabled = true) =>
  useQuery<Paged<OpsNote>>({
    queryKey: opsKeys.notes(params),
    queryFn: () =>
      get('/api/v1/ops/notes', {
        ...params,
        flagsOnly: params.flagsOnly === undefined ? undefined : String(params.flagsOnly),
        limit: 20,
      }),
    enabled,
  });

export const useCreateOpsNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpsNoteInput) => api.post('/api/v1/ops/notes', input).then((r) => r.data.data as OpsNote),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['ops', 'notes'] });
      qc.invalidateQueries({ queryKey: opsKeys.queue });
      toast.success(note.isFlag ? 'Flag sent to head office' : 'Note saved');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not save the note')),
  });
};

/** Admin only. */
export const useResolveOpsFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      api.post(`/api/v1/admin/ops-flags/${id}/resolve`, { resolution }).then((r) => r.data.data as OpsNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ops', 'notes'] });
      qc.invalidateQueries({ queryKey: opsKeys.queue });
      toast.success('Flag resolved');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not resolve the flag')),
  });
};

const useOrderAction = <V>(path: string, success: string, method: 'post' | 'put' = 'post') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body?: V }) =>
      api[method](`/api/v1/ops/orders/${orderId}/${path}`, body ?? {}).then((r) => r.data.data),
    onSuccess: (_data, { orderId }) => {
      qc.invalidateQueries({ queryKey: opsKeys.order(orderId) });
      qc.invalidateQueries({ queryKey: opsKeys.queue });
      toast.success(success);
    },
    onError: (err) => toast.error(errorMessage(err, 'That did not work')),
  });
};

export interface RatingBody {
  vendorId: string;
  punctuality: number;
  quality: number;
  communication: number;
  packaging: number;
  note?: string;
}

export const useOpsRatePartner = () => useOrderAction<RatingBody>('partner-ratings', 'Rating saved');
export const useOpsConfirmRecipient = () =>
  useOrderAction<{ note: string }>('recipient-confirmation', 'Delivery confirmed with the recipient');
export const useOpsResendLink = () =>
  useOrderAction<undefined>('vendor-link/resend', 'Link sent to the partner by email and SMS');

export const useOpsSetVettingCheck = (vendorId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, status, note }: { kind: string; status: 'PENDING' | 'PASSED' | 'FAILED'; note?: string }) =>
      api.put(`/api/v1/ops/partners/${vendorId}/vetting/${kind}`, { status, note }).then((r) => r.data.data),
    onSuccess: (data) => {
      qc.setQueryData(opsKeys.partner(vendorId), data);
      qc.invalidateQueries({ queryKey: ['ops', 'partners'] });
      toast.success('Vetting check saved');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not save the check')),
  });
};

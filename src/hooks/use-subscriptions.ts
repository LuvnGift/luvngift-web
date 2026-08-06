'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Subscription types come from @luvngift/shared so web and mobile stay on one
 * contract. Imported for use in this file and re-exported so components keep
 * importing them from here.
 */
import type {
  SubscriptionPlan,
  Subscription,
  SubscriptionCatalogueItem as CatalogueItem,
  SubscriptionInterval,
  SubstitutionPreference,
  CreateSubscriptionResult,
} from '@luvngift/shared';

export { DIETARY_FLAGS } from '@luvngift/shared';
export type {
  SubscriptionPlan,
  SubscriptionPrice,
  Subscription,
  SubscriptionItem,
  SubscriptionCatalogueItem as CatalogueItem,
  SubscriptionInterval,
  SubscriptionStatus,
  SubstitutionPreference,
  CreateSubscriptionResult,
} from '@luvngift/shared';

export interface Address {
  id: string;
  recipientName: string;
  recipientPhone: string;
  street: string;
  city: string;
  state: string;
  country: string;
}

const MINE_KEY = ['subscriptions', 'mine'];

// ─── Catalogue ────────────────────────────────────────────────────────────────

export const usePlans = () =>
  useQuery<SubscriptionPlan[]>({
    queryKey: ['subscriptions', 'plans'],
    queryFn: () => api.get('/api/v1/subscriptions/plans').then((r) => r.data.data),
  });

/** Catalogue is scoped to the recipient's state — availability varies by region. */
export const useCatalogue = (addressId?: string) =>
  useQuery<CatalogueItem[]>({
    queryKey: ['subscriptions', 'items', addressId],
    queryFn: () => api.get(`/api/v1/subscriptions/items/${addressId}`).then((r) => r.data.data),
    enabled: Boolean(addressId),
  });

// ─── Addresses ────────────────────────────────────────────────────────────────

export const useAddresses = (enabled = true) =>
  useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: () => api.get('/api/v1/users/me/addresses').then((r) => r.data.data),
    enabled,
  });

export const useCreateAddress = () => {
  const qc = useQueryClient();
  return useMutation<Address, Error, Omit<Address, 'id'>>({
    mutationFn: (data) => api.post('/api/v1/users/me/addresses', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Couldn't save that address."),
  });
};

// ─── Subscribe ────────────────────────────────────────────────────────────────

interface CreateSubscriptionInput {
  planId: string;
  addressId: string;
  interval: SubscriptionInterval;
  items: { customItemId: string; quantity: number }[];
  substitutionPreference?: SubstitutionPreference;
  dietaryFlags?: string[];
  dietaryNotes?: string;
}

export const useCreateSubscription = () =>
  useMutation<CreateSubscriptionResult, Error, CreateSubscriptionInput>({
    mutationFn: (data) => api.post('/api/v1/subscriptions', data).then((r) => r.data.data),
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Couldn't start your subscription."),
  });

// ─── Manage ───────────────────────────────────────────────────────────────────

export const useMySubscriptions = (enabled = true) =>
  useQuery<Subscription[]>({
    queryKey: MINE_KEY,
    queryFn: () => api.get('/api/v1/subscriptions').then((r) => r.data.data),
    enabled,
  });

function useSubscriptionAction(
  path: (id: string) => string,
  successMessage: string,
  body?: unknown,
) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.post(path(id), body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      toast.success(successMessage);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Something went wrong.'),
  });
}

export const useSkipCycle = (skip: boolean) =>
  useSubscriptionAction(
    (id) => `/api/v1/subscriptions/${id}/skip`,
    skip ? 'Next delivery skipped' : 'Skip cancelled — your next delivery is back on',
    { skip },
  );

export const usePauseSubscription = () =>
  useSubscriptionAction((id) => `/api/v1/subscriptions/${id}/pause`, 'Subscription paused');

export const useResumeSubscription = () =>
  useSubscriptionAction((id) => `/api/v1/subscriptions/${id}/resume`, 'Subscription resumed');

export const useCancelSubscription = () =>
  useSubscriptionAction(
    (id) => `/api/v1/subscriptions/${id}/cancel`,
    'Subscription will end after your current cycle',
  );

export const useUpdateSubstitutionPreference = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; substitutionPreference: SubstitutionPreference }>({
    mutationFn: ({ id, substitutionPreference }) =>
      api
        .put(`/api/v1/subscriptions/${id}/preference`, { substitutionPreference })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      toast.success('Substitution preference updated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Couldn't update your preference."),
  });
};

export const useUpdateDietary = () => {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; dietaryFlags: string[]; dietaryNotes?: string }
  >({
    mutationFn: ({ id, ...data }) =>
      api.put(`/api/v1/subscriptions/${id}/dietary`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      toast.success('Dietary requirements saved');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Couldn't save that."),
  });
};

export const useUpdateSubscriptionItems = () => {
  const qc = useQueryClient();
  return useMutation<
    Subscription,
    Error,
    { id: string; items: { customItemId: string; quantity: number }[] }
  >({
    mutationFn: ({ id, items }) =>
      api.put(`/api/v1/subscriptions/${id}/items`, { items }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      toast.success('Box updated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? "Couldn't update your box."),
  });
};

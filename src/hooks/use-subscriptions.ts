'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

import type { input } from 'zod';
import type {
  BasketQuote,
  BoxCatalogueItem,
  CancelQuote,
  CreateSubscriptionResult,
  StartDates,
  Subscription,
  SubscriptionPlan,
  SubstitutionPreference,
  createSubscriptionSchema,
} from '@luvngift/shared';

/**
 * Every subscription type and rule is in @luvngift/shared: the API builds its
 * responses from the same declarations, and the app uses them too. Re-exported
 * here so components keep one import site; nothing is declared again here.
 */
export { DIETARY_FLAGS, hasNotStarted, isBasket, isCurated } from '@luvngift/shared';
export type {
  BasketQuote,
  BoxCatalogueItem,
  CancelQuote,
  CreateSubscriptionResult,
  PlanContent,
  StartDates,
  Subscription,
  SubscriptionDelivery,
  SubscriptionInterval,
  SubscriptionItem,
  SubscriptionPlan,
  SubscriptionPrice,
  SubscriptionStatus,
  SubscriptionTermSummary,
  SubstitutionPreference,
} from '@luvngift/shared';


/** A plan as the box picker reads it (the minimum fill is on every plan payload). */
export type BoxPlan = SubscriptionPlan;

/** Null for a plan paid per delivery, or a year fully delivered. */
export const fetchCancelQuote = (id: string) =>
  api.get(`/api/v1/subscriptions/${id}/cancel-quote`).then((r) => r.data.data as CancelQuote | null);

export const useStartDates = () =>
  useQuery<StartDates>({
    queryKey: ['subscriptions', 'start-dates'],
    queryFn: () => api.get('/api/v1/subscriptions/start-dates').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

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

/** Platform delivery window, for turning a promised start date into a range. */
export const useDeliveryWindow = () =>
  useQuery<{ leadDays: number; windowDays: number }>({
    queryKey: ['settings', 'delivery-window'],
    queryFn: () => api.get('/api/v1/settings/delivery-window').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

// ─── Catalogue ────────────────────────────────────────────────────────────────

export const usePlans = () =>
  useQuery<SubscriptionPlan[]>({
    queryKey: ['subscriptions', 'plans'],
    queryFn: () => api.get('/api/v1/subscriptions/plans').then((r) => r.data.data),
  });

/** Catalogue is scoped to the recipient's state — availability varies by region. */
export const useCatalogue = (addressId?: string, planId?: string) =>
  useQuery<BoxCatalogueItem[]>({
    queryKey: ['subscriptions', 'items', addressId, planId],
    queryFn: () =>
      api
        .get(`/api/v1/subscriptions/items/${addressId}`, { params: { planId } })
        .then((r) => r.data.data),
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

/** The request body, as the shared schema accepts it. */
type CreateSubscriptionInput = input<typeof createSubscriptionSchema>;


/**
 * A basket's all-in price per delivery as it is built. Keyed on the exact
 * contents so the shown price always belongs to the basket on screen;
 * `placeholderData` keeps the last figure while the next one loads.
 */
export const useBasketQuote = (
  planId: string | undefined,
  addressId: string | undefined,
  picked: Record<string, number>,
  enabled: boolean,
) => {
  const items = Object.entries(picked)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([customItemId, quantity]) => ({ customItemId, quantity }));
  return useQuery<BasketQuote>({
    queryKey: ['subscriptions', 'basket-quote', planId, addressId, items],
    queryFn: () =>
      api.post('/api/v1/subscriptions/basket-quote', { planId, addressId, items }).then((r) => r.data.data),
    enabled: enabled && Boolean(planId && addressId),
    placeholderData: (previous) => previous,
    retry: false,
  });
};

export const useCreateSubscription = () => {
  const qc = useQueryClient();
  return useMutation<CreateSubscriptionResult, Error, CreateSubscriptionInput>({
    mutationFn: (data) => api.post('/api/v1/subscriptions', data).then((r) => r.data.data),
    onError: (err: any) => {
      // A basket price that moved since it was shown: fetch the new one.
      qc.invalidateQueries({ queryKey: ['subscriptions', 'basket-quote'] });
      toast.error(err?.response?.data?.error?.message ?? "Couldn't start your subscription.");
    },
  });
};

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
    { id: string; items: { customItemId: string; quantity: number }[]; expectedAmount?: number }
  >({
    mutationFn: ({ id, items, expectedAmount }) =>
      api.put(`/api/v1/subscriptions/${id}/items`, { items, expectedAmount }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE_KEY });
      toast.success('Box updated');
    },
    onError: (err: any) => {
      // A basket price that moved: refresh the quote so the new one is on screen.
      qc.invalidateQueries({ queryKey: ['subscriptions', 'basket-quote'] });
      toast.error(err?.response?.data?.error?.message ?? "Couldn't update your box.");
    },
  });
};

// ─── Points ───────────────────────────────────────────────────────────────────

export interface PointsSummary {
  balance: number;
  expiringSoon: { points: number; firstOn: string | null };
  minRedeem: number;
  /** Points that take 1 unit (US$1, CA$1, £1) off a charge. */
  pointsPerCurrencyUnit: number;
  earnRule: { pointsPerStep: number; stepPercent: number };
  /** Points set to come off a subscription's next charge. */
  pending: { subscriptionId: string; points: number; createdAt: string }[];
  /** Points earned on each subscription and still unspent: what cancelling it removes. */
  bySubscription: { subscriptionId: string; points: number }[];
  history: { id: string; kind: 'EARNED' | 'REDEEMED' | 'FORFEITED'; points: number; createdAt: string; expiresAt: string | null; note: string | null }[];
}

const POINTS_KEY = ['subscriptions', 'points'] as const;

export const usePoints = (enabled = true) =>
  useQuery<PointsSummary>({
    queryKey: POINTS_KEY,
    queryFn: () => api.get('/api/v1/subscriptions/points').then((r) => r.data.data),
    enabled,
  });

export const useApplyPoints = () => {
  const qc = useQueryClient();
  return useMutation<{ points: number; discount: number; currency: string }, Error, { id: string; points: number }>({
    mutationFn: ({ id, points }) => api.post(`/api/v1/subscriptions/${id}/points`, { points }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POINTS_KEY });
      toast.success('Your points will come off the next charge');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Couldn't use your points."),
  });
};

export const useUndoPoints = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/api/v1/subscriptions/${id}/points`).then(() => undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POINTS_KEY });
      toast.success('Points returned to your balance');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Couldn't undo that."),
  });
};

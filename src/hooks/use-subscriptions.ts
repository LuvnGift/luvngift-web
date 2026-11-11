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
  SubscriptionPlan as SharedSubscriptionPlan,
  SubscriptionPrice as SharedSubscriptionPrice,
  Subscription as SharedSubscription,
  SubscriptionCatalogueItem as CatalogueItem,
  SubstitutionPreference,
  CreateSubscriptionResult as SharedCreateSubscriptionResult,
} from '@luvngift/shared';
import type { Interval } from '@/lib/cadence';

export { DIETARY_FLAGS } from '@luvngift/shared';
export type {
  SubscriptionItem,
  SubscriptionCatalogueItem as CatalogueItem,
  SubscriptionStatus,
  SubstitutionPreference,
} from '@luvngift/shared';

/**
 * Cadences: the shared package still says MONTHLY | BIWEEKLY. Every 2 months
 * and quarterly were added in the API first (2026-11-06), so these types are
 * widened here until the next package publish.
 */
export type SubscriptionInterval = Interval;
export type SubscriptionPrice = Omit<SharedSubscriptionPrice, 'interval'> & { interval: Interval };
/** One line of a curated box, as the public may see it (no naira cost). */
export interface PlanContent {
  quantity: number;
  customItem: { id: string; name: string; description?: string | null; category: string; availableStates: string[] };
}

/**
 * `kind` and `contents` came with curated plans (2026-11-11) and are not in
 * the shared package yet. CURATED: the box is set by us and delivered as is.
 * ALLOWANCE (or missing, from an older API): the subscriber fills the box.
 */
export type SubscriptionPlan = Omit<SharedSubscriptionPlan, 'prices'> & {
  prices: SubscriptionPrice[];
  kind?: 'ALLOWANCE' | 'CURATED';
  contents?: PlanContent[];
};

/** Takes any plan shape: the subscriber view's plan is still the shared type, which has no `kind`. */
export const isCurated = (plan?: object | null) => (plan as { kind?: string } | null)?.kind === 'CURATED';

/** One delivery of a subscription, as its subscriber may see it. */
export interface SubscriptionDelivery {
  id: string;
  status: string;
  createdAt: string;
  preferredDeliveryDate: string | null;
  deliveryProofUrl: string | null;
  deliveryProofAt: string | null;
}

/**
 * The shared type plus what the API added after the last package publish:
 * a later start date, and the most recent deliveries.
 */
export type Subscription = Omit<SharedSubscription, 'interval'> & {
  interval: Interval;
  /** First charge time of a subscription that starts later; null = already charging. */
  startsAt?: string | null;
  orders?: SubscriptionDelivery[];
};

export type CreateSubscriptionResult = SharedCreateSubscriptionResult & {
  /** confirmSetup for a later start (nothing charged now), confirmPayment otherwise. */
  intentType?: 'setup' | 'payment';
  startsAt?: string | null;
  firstDeliveryFrom?: string | null;
};

/** True while a later-starting subscription has not taken its first charge. */
export const hasNotStarted = (sub: Pick<Subscription, 'startsAt'>) =>
  Boolean(sub.startsAt && new Date(sub.startsAt).getTime() > Date.now());

/** The first delivery dates that can be chosen today, as YYYY-MM-DD. The API owns the rule. */
export interface StartDates {
  earliest: string;
  latest: string;
  leadDays: number;
  maxDaysAhead: number;
}

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

/**
 * A box-picker item. `share` is the percentage of the plan's box one unit uses;
 * the naira cost behind it is never sent. Declared here rather than in
 * `@luvngift/shared` until the next package publish.
 */
export interface BoxCatalogueItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  share: number | null;
}

/** Public plans embed the minimum box fill so the picker needs no extra request. */
export type BoxPlan = SubscriptionPlan & { boxMinFillPercent?: number };

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

interface CreateSubscriptionInput {
  planId: string;
  addressId: string;
  interval: SubscriptionInterval;
  items: { customItemId: string; quantity: number }[];
  substitutionPreference?: SubstitutionPreference;
  dietaryFlags?: string[];
  dietaryNotes?: string;
  /** YYYY-MM-DD. Omitted = start now. */
  firstDeliveryDate?: string;
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

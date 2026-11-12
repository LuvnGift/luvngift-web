'use client';

/**
 * Admin hooks for fulfilment partners: an order's partner (one per order) and
 * payouts, the payouts ledger, partner profiles (states covered, vetting, pay
 * terms and payout schedule) and Settings → Fulfilment (band fees). Enums from @luvngift/shared; the API is luvngift-api/src/modules/partners.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

import {
  PAYOUT_MODE_LABELS,
  type FulfilmentBand,
  type FulfilmentRulesInput,
  type PartnerPayTerms,
  type PayoutMode,
  type VettingKind,
} from '@luvngift/shared';

// The enums and labels are the API's own (@luvngift/shared).
export type { PayoutMode, VettingKind };
export { PAYOUT_MODE_LABELS };
export type PayTerms = PartnerPayTerms;
/** Lines made before 2026-11-11 may carry a retired role; new ones are FULFILMENT. */
export type LineRole = 'FULFILMENT' | 'SOURCING' | 'AGENT' | 'DELIVERY';
export const ROLE_LABELS: Record<LineRole, string> = {
  FULFILMENT: 'Fulfilment',
  SOURCING: 'Goods (old split)',
  AGENT: 'Agent (old split)',
  DELIVERY: 'Delivery (old split)',
};
/** A retired schedule on an old row reads as on delivery, as the API pays it. */
export const payoutModeLabel = (mode: string | null) =>
  mode === 'SPLIT' ? PAYOUT_MODE_LABELS.SPLIT : PAYOUT_MODE_LABELS.ON_DELIVERY;

export interface PartnerScore {
  ratingCount: number;
  averageRating: number | null;
  onTimeRate: number | null;
  confirmationRate: number | null;
  score: number | null;
}

export interface Payout {
  id: string;
  vendorId: string;
  kind: 'ADVANCE' | 'REIMBURSEMENT' | 'BALANCE';
  amountNgn: number;
  status: 'DUE' | 'PAID' | 'CANCELLED';
  reference: string | null;
  paidAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
}

export interface PartnerLine {
  id: string;
  role: LineRole;
  amountNgn: number;
  owedNgn: number;
  vendorId: string | null;
  payoutMode: string | null;
  splitPercent: number | null;
  vendor: { id: string; name: string; businessType: string; payTerms: PayTerms; phone: string; email: string } | null;
  payouts: Payout[];
}

export interface Candidate {
  id: string;
  name: string;
  businessType: string;
  payTerms: PayTerms;
  payoutMode: string;
  score: PartnerScore | null;
}

export interface OrderFulfilment {
  order: {
    id: string;
    status: string;
    deliveryState: string;
    leadVendorId: string | null;
    recipientConfirmedAt: string | null;
    recipientConfirmedVia: 'CODE' | 'ADMIN' | null;
  };
  requireRecipientConfirmation: boolean;
  /** Today's band and fee for the recipient's state (the line keeps what was snapshotted). */
  band: FulfilmentBand;
  bandFeeNgn: number;
  lines: PartnerLine[];
  totalNgn: number;
  receipts: { id: string; vendorId: string; imageUrl: string; amountNgn: number; note: string | null; status: string; createdAt: string }[];
  timeline: { id: string; kind: string; role: LineRole | null; vendorId: string | null; createdAt: string }[];
  ratings: { vendorId: string; punctuality: number; quality: number; communication: number; packaging: number | null; note: string | null }[];
  /** Approved partners covering the recipient's state, best score first. */
  candidates: Candidate[];
}

export const nairaLabel = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;
const errorMessage = (err: any, fallback: string) => err?.response?.data?.error?.message ?? fallback;

const fulfilmentKey = (orderId: string) => ['admin', 'fulfilment', orderId];

export const useOrderFulfilment = (orderId: string) =>
  useQuery<OrderFulfilment>({
    queryKey: fulfilmentKey(orderId),
    queryFn: () => api.get(`/api/v1/admin/orders/${orderId}/fulfilment`).then((r) => r.data.data),
    enabled: !!orderId,
  });

/** Every write here returns the refreshed fulfilment view, so it replaces the cache directly. */
function useFulfilmentWrite<T>(orderId: string, request: (input: T) => Promise<unknown>, success: string, failure: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fulfilmentKey(orderId) });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      toast.success(success);
    },
    onError: (err: any) => toast.error(errorMessage(err, failure)),
  });
}

/** What the partner is owed (goods + fee), for a custom gift or to correct one. */
export const useSetPartnerAmount = (orderId: string) =>
  useFulfilmentWrite<number>(
    orderId,
    (amountNgn) => api.put(`/api/v1/admin/orders/${orderId}/fulfilment/amount`, { amountNgn }),
    'Partner amount saved',
    'Could not save the amount',
  );

export const useConfirmRecipient = (orderId: string) =>
  useFulfilmentWrite<string>(
    orderId,
    (note) => api.post(`/api/v1/admin/orders/${orderId}/recipient-confirmation`, { note }),
    'Recipient confirmation recorded',
    'Could not record the confirmation',
  );

export const useRatePartner = (orderId: string) =>
  useFulfilmentWrite<{ vendorId: string; punctuality: number; quality: number; communication: number; packaging: number; note?: string }>(
    orderId,
    (body) => api.post(`/api/v1/admin/orders/${orderId}/partner-ratings`, body),
    'Rating saved',
    'Could not save the rating',
  );

export const useReviewReceipt = (orderId: string) =>
  useFulfilmentWrite<{ id: string; approve: boolean; amountNgn?: number }>(
    orderId,
    ({ id, ...body }) => api.post(`/api/v1/admin/partner-receipts/${id}/review`, body),
    'Receipt reviewed',
    'Could not review the receipt',
  );

// ─── Payouts ledger ───────────────────────────────────────────────────────────

export interface PayoutRow extends Payout {
  vendor: { id: string; name: string; phone: string };
  line: { orderId: string; role: LineRole };
}

export const usePayouts = (filters: { status?: string; vendorId?: string; page: number }) =>
  useQuery<{ data: PayoutRow[]; meta: { total: number; page: number; totalPages: number }; dueNgn: number; pendingReceipts: number }>({
    queryKey: ['admin', 'payouts', filters],
    queryFn: () =>
      api.get('/api/v1/admin/partner-payouts', { params: { ...filters, limit: 25 } }).then((r) => r.data.data),
  });

function usePayoutWrite<T>(request: (input: T) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'fulfilment'] });
      toast.success(success);
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Could not update the payout')),
  });
}

export const useMarkPayoutPaid = () =>
  usePayoutWrite<{ id: string; reference: string; note?: string }>(
    ({ id, ...body }) => api.post(`/api/v1/admin/partner-payouts/${id}/paid`, body),
    'Payment recorded',
  );

export const useCancelPayout = () =>
  usePayoutWrite<{ id: string; reason: string }>(
    ({ id, reason }) => api.post(`/api/v1/admin/partner-payouts/${id}/cancel`, { reason }),
    'Payout cancelled',
  );

// ─── Partner profile ──────────────────────────────────────────────────────────

export interface PartnerProfile {
  id: string;
  name: string;
  status: string;
  payTerms: PayTerms;
  payoutMode: string;
  splitPercent: number | null;
  cacNumber: string | null;
  portfolioUrl: string | null;
  coverage: { id: string; state: string }[];
  vetting: {
    kind: VettingKind;
    label: string;
    required: boolean;
    status: 'PENDING' | 'PASSED' | 'FAILED';
    note: string | null;
    checkedAt: string | null;
  }[];
  missingChecks: string[];
  score: PartnerScore | null;
}

const profileKey = (id: string) => ['admin', 'partner', id];

export const usePartnerProfile = (id: string) =>
  useQuery<PartnerProfile>({
    queryKey: profileKey(id),
    queryFn: () => api.get(`/api/v1/admin/partners/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

function useProfileWrite<T>(id: string, request: (input: T) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKey(id) });
      qc.invalidateQueries({ queryKey: ['admin', 'vendor', id] });
      toast.success(success);
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Could not save')),
  });
}

export const useSetCoverage = (id: string) =>
  useProfileWrite<string[]>(
    id,
    (states) => api.put(`/api/v1/admin/partners/${id}/coverage`, { states }),
    'Coverage saved',
  );

export const useSetVettingCheck = (id: string) =>
  useProfileWrite<{ kind: VettingKind; status: 'PENDING' | 'PASSED' | 'FAILED'; note?: string }>(
    id,
    ({ kind, ...body }) => api.put(`/api/v1/admin/partners/${id}/vetting/${kind}`, body),
    'Vetting updated',
  );

export const useSetPayTerms = (id: string) =>
  useProfileWrite<{ payTerms: PayTerms; payoutMode: PayoutMode; splitPercent: number | null }>(
    id,
    (body) => api.put(`/api/v1/admin/partners/${id}/pay-terms`, body),
    'Pay terms saved',
  );

// ─── Settings → Fulfilment ───────────────────────────────────────────────────

/** The wire shape is the shared schema's: band fees, the state → band map and the defaults. */
export type FulfilmentRules = FulfilmentRulesInput;

export const useFulfilmentRules = () =>
  useQuery<FulfilmentRules & { defaults: FulfilmentRules }>({
    queryKey: ['admin', 'fulfilment-rules'],
    queryFn: () => api.get('/api/v1/admin/settings/fulfilment-rules').then((r) => r.data.data),
  });

export const useSetFulfilmentRules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rules: FulfilmentRules) => api.put('/api/v1/admin/settings/fulfilment-rules', rules),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'fulfilment-rules'] });
      toast.success('Fulfilment settings saved');
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Could not save the settings')),
  });
};

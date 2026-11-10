'use client';

/**
 * Admin hooks for fulfilment partners: an order's partner lines and payouts,
 * the payouts ledger, partner profiles (coverage, vetting, pay terms) and
 * Settings → Fulfilment. Mirrors luvngift-api/src/modules/partners.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export type FulfilmentRole = 'SOURCING' | 'AGENT' | 'DELIVERY';
export type PayoutMode = 'ADVANCE' | 'REIMBURSE' | 'SPLIT';
export type PayTerms = 'REVENUE_SHARE' | 'FIXED_NAIRA';
export type VettingKind =
  | 'ID_VERIFIED'
  | 'GUARANTOR_CONFIRMED'
  | 'REFERENCES_CHECKED'
  | 'ADDRESS_VERIFIED'
  | 'INTERVIEWED'
  | 'TRAINED';

export const ROLES: FulfilmentRole[] = ['SOURCING', 'AGENT', 'DELIVERY'];
export const ROLE_LABELS: Record<FulfilmentRole, string> = {
  SOURCING: 'Goods',
  AGENT: 'Agent',
  DELIVERY: 'Delivery',
};
export const PAYOUT_MODE_LABELS: Record<PayoutMode, string> = {
  ADVANCE: 'Advance (goods money first)',
  REIMBURSE: 'Reimburse (on receipts)',
  SPLIT: 'Split (part now, rest on delivery)',
};

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
  role: FulfilmentRole;
  amountNgn: number;
  owedNgn: number;
  vendorId: string | null;
  payoutMode: PayoutMode | null;
  splitPercent: number | null;
  vendor: { id: string; name: string; businessType: string; payTerms: PayTerms; phone: string; email: string } | null;
  payouts: Payout[];
}

export interface Candidate {
  id: string;
  name: string;
  businessType: string;
  payTerms: PayTerms;
  payoutMode: PayoutMode;
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
  lines: PartnerLine[];
  totalNgn: number;
  receipts: { id: string; vendorId: string; imageUrl: string; amountNgn: number; note: string | null; status: string; createdAt: string }[];
  timeline: { id: string; kind: string; role: FulfilmentRole | null; vendorId: string | null; createdAt: string }[];
  ratings: { vendorId: string; punctuality: number; quality: number; communication: number; note: string | null }[];
  candidates: Record<FulfilmentRole, Candidate[]>;
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

export const useSetPartnerAmounts = (orderId: string) =>
  useFulfilmentWrite<{ role: FulfilmentRole; amountNgn: number }[]>(
    orderId,
    (lines) => api.put(`/api/v1/admin/orders/${orderId}/fulfilment/amounts`, { lines }),
    'Partner amounts saved',
    'Could not save the amounts',
  );

export const useAssignPartnerLine = (orderId: string) =>
  useFulfilmentWrite<{ role: FulfilmentRole; vendorId: string; payoutMode?: PayoutMode; splitPercent?: number }>(
    orderId,
    ({ role, ...body }) => api.put(`/api/v1/admin/orders/${orderId}/fulfilment/lines/${role}`, body),
    'Partner assigned',
    'Could not assign the partner',
  );

export const useConfirmRecipient = (orderId: string) =>
  useFulfilmentWrite<string>(
    orderId,
    (note) => api.post(`/api/v1/admin/orders/${orderId}/recipient-confirmation`, { note }),
    'Recipient confirmation recorded',
    'Could not record the confirmation',
  );

export const useRatePartner = (orderId: string) =>
  useFulfilmentWrite<{ vendorId: string; punctuality: number; quality: number; communication: number; note?: string }>(
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
  line: { orderId: string; role: FulfilmentRole };
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
  businessType: string;
  status: string;
  payTerms: PayTerms;
  payoutMode: PayoutMode;
  splitPercent: number | null;
  idType: string | null;
  idNumberLast4: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  guarantorRelationship: string | null;
  transport: string | null;
  coverage: { id: string; state: string; role: FulfilmentRole }[];
  references: { id: string; name: string; phone: string; relationship: string }[];
  documents: { id: string; kind: string; format: string; createdAt: string }[];
  vetting: { kind: VettingKind; label: string; status: 'PENDING' | 'PASSED' | 'FAILED'; note: string | null; checkedAt: string | null }[];
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
  useProfileWrite<{ state: string; role: FulfilmentRole }[]>(
    id,
    (entries) => api.put(`/api/v1/admin/partners/${id}/coverage`, { entries }),
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

/** A five-minute link to a private ID document. Every view is audited. */
export const useDocumentLink = (id: string) =>
  useMutation({
    mutationFn: (documentId: string) =>
      api.get(`/api/v1/admin/partners/${id}/documents/${documentId}`).then((r) => r.data.data as { url: string }),
    onError: (err: any) => toast.error(errorMessage(err, 'Could not open the document')),
  });

// ─── Settings → Fulfilment ───────────────────────────────────────────────────

export interface FulfilmentRules {
  defaultAgentFeeNgn: number;
  defaultDeliveryFeeNgn: number;
  defaultPlatformPercent: number;
  fxBufferPercent: number;
  defaultSplitPercent: number;
  requireRecipientConfirmation: boolean;
}

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

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
  type PartnerBankAccountInput,
  type PartnerBankAccountStatus,
  type PartnerBankAccountView,
  type PartnerBankLinkView,
  type IssuePartnerBankLinkInput,
  type CancelPartnerBankLinkInput,
  type PartnerPayTerms,
  type BatchPreviewPartner,
  type MonthlyPayoutReport,
  type OrderMoneyView,
  type PartnerPayoutSummary,
  type PayoutFundingInput,
  type PayoutFundingView,
  type PayoutReconciliationInput,
  type CreatePayoutBatchInput,
  type PartnerAdjustmentInput,
  type PartnerAdjustmentView,
  type PayoutBatchView,
  type PayoutTransferView,
  type TransferFailedInput,
  type PayoutCancelInput,
  type PayoutEventView,
  type PayoutMode,
  type VerifyPartnerBankAccountInput,
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
  status: 'DUE' | 'BATCHED' | 'PAID' | 'CANCELLED';
  reference: string | null;
  paidAt: string | null;
  cancelledReason: string | null;
  /** The transfer receipt uploaded when the payment was recorded. */
  proofUrl?: string | null;
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

/**
 * Gives the order's partner any line they do not hold and, on a delivered
 * order, makes due whatever they are still owed. Safe to press twice.
 */
export const useRecalculatePayouts = (orderId: string) =>
  useFulfilmentWrite<void>(
    orderId,
    () => api.post(`/api/v1/admin/orders/${orderId}/fulfilment/recalculate`),
    'Payouts recalculated',
    'Could not recalculate payouts',
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

/** A partner's current bank account as the payouts list carries it (never the full number). */
export interface PayableAccount {
  id: string;
  status: PartnerBankAccountStatus;
  bankName: string;
  accountLast4: string;
  accountName: string;
}

export interface PayoutRow extends Payout {
  vendor: { id: string; name: string; phone: string; bankAccounts: PayableAccount[] };
  line: { orderId: string; role: LineRole };
  /** The account a PAID payout went to. */
  bankAccount: { id: string; bankName: string; accountLast4: string } | null;
  /** The batch a BATCHED (or batch-paid) payout is in. */
  transfer: { batchId: string } | null;
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

/**
 * Recording a transfer: multipart, because it carries the bank's receipt as
 * `proof`. A fresh 2FA code is required for this and for a cancellation.
 */
export const useMarkPayoutPaid = () =>
  usePayoutWrite<{ id: string; reference: string; note?: string; totpCode: string; proof: File }>(
    ({ id, reference, note, totpCode, proof }) => {
      const body = new FormData();
      body.append('reference', reference);
      if (note) body.append('note', note);
      body.append('totpCode', totpCode);
      body.append('proof', proof);
      return api.post(`/api/v1/admin/partner-payouts/${id}/paid`, body);
    },
    'Payment recorded',
  );

export const useCancelPayout = () =>
  usePayoutWrite<{ id: string } & PayoutCancelInput>(
    ({ id, ...body }) => api.post(`/api/v1/admin/partner-payouts/${id}/cancel`, body),
    'Payout cancelled',
  );

// ─── Bank details and the money trail ────────────────────────────────────────

export interface PartnerBankAccounts {
  /** Pending or verified; carries the full account number. */
  current: (PartnerBankAccountView & { accountNumber: string }) | null;
  /** Earlier accounts, masked. */
  history: PartnerBankAccountView[];
  /** The most recent one-time bank-details link, if one was ever sent. Never carries the URL. */
  link: PartnerBankLinkView | null;
  /** Set while a recent change to the partner's email or phone blocks sending a link. */
  linkHoldUntil: string | null;
}

const bankKey = (id: string) => ['admin', 'partner', id, 'bank-account'];
const trailKey = (id: string) => ['admin', 'partner', id, 'payout-events'];

export const usePartnerBankAccount = (id: string) =>
  useQuery<PartnerBankAccounts>({
    queryKey: bankKey(id),
    queryFn: () => api.get(`/api/v1/admin/partners/${id}/bank-account`).then((r) => r.data.data),
    enabled: !!id,
  });

export const usePartnerPayoutEvents = (id: string, page: number) =>
  useQuery<{ data: PayoutEventView[]; meta: { total: number; page: number; totalPages: number } }>({
    queryKey: [...trailKey(id), page],
    queryFn: () =>
      api.get(`/api/v1/admin/partners/${id}/payout-events`, { params: { page, limit: 10 } }).then((r) => r.data.data),
    enabled: !!id,
  });

function useBankWrite<T>(id: string, request: (input: T) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankKey(id) });
      qc.invalidateQueries({ queryKey: trailKey(id) });
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      toast.success(success);
    },
    onError: (err: any) => toast.error(errorMessage(err, 'Could not save the bank details')),
  });
}

export const useSavePartnerBankAccount = (id: string) =>
  useBankWrite<PartnerBankAccountInput>(
    id,
    (body) => api.put(`/api/v1/admin/partners/${id}/bank-account`, body),
    'Bank details saved. Verify them before paying.',
  );

export const useVerifyPartnerBankAccount = (id: string) =>
  useBankWrite<VerifyPartnerBankAccountInput>(
    id,
    (body) => api.post(`/api/v1/admin/partners/${id}/bank-account/verify`, body),
    'Bank details verified',
  );

/** Emails and texts the partner a one-time link to add or change their own details. */
export const useSendPartnerBankLink = (id: string) =>
  useBankWrite<IssuePartnerBankLinkInput>(
    id,
    (body) => api.post(`/api/v1/admin/partners/${id}/bank-link`, body),
    'Link on its way to the partner by email and SMS',
  );

export const useCancelPartnerBankLink = (id: string) =>
  useBankWrite<CancelPartnerBankLinkInput>(
    id,
    (body) => api.post(`/api/v1/admin/partners/${id}/bank-link/cancel`, body),
    'Link withdrawn',
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
  useProfileWrite<{ payoutMode: PayoutMode; splitPercent: number | null }>(
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

// ─── Payout batches and adjustments (phase 2) ────────────────────────────────

const batchesKey = ['admin', 'payout-batches'];
const adjustmentsKey = ['admin', 'partner-adjustments'];

/** Error bodies of a blob request arrive as a Blob; read the API's message out of it. */
async function blobErrorMessage(err: any, fallback: string): Promise<string> {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.error?.message ?? fallback;
    } catch {
      return fallback;
    }
  }
  return errorMessage(err, fallback);
}

function useMoneyWrite<T, R = unknown>(request: (input: T) => Promise<R>, success: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: batchesKey });
      qc.invalidateQueries({ queryKey: adjustmentsKey });
      qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'partner'] });
      qc.invalidateQueries({ queryKey: ['admin', 'fulfilment'] });
      if (success) toast.success(success);
    },
    onError: async (err: any) => toast.error(await blobErrorMessage(err, 'Could not save')),
  });
}

export type BatchPreview = { partners: BatchPreviewPartner[]; payableNgn: number };
export type PayoutBatchDetail = PayoutBatchView & { reference: string; transfers: PayoutTransferView[] };
export type PayoutBatchRow = PayoutBatchView & { reference: string };

export const useBatchPreview = (enabled = true) =>
  useQuery<BatchPreview>({
    queryKey: [...batchesKey, 'preview'],
    queryFn: () => api.get('/api/v1/admin/payout-batches/preview').then((r) => r.data.data),
    enabled,
  });

export const usePayoutBatches = (filters: { status?: 'OPEN' | 'CLOSED'; page: number }) =>
  useQuery<{ data: PayoutBatchRow[]; meta: { total: number; page: number; totalPages: number } }>({
    queryKey: [...batchesKey, 'list', filters],
    queryFn: () => api.get('/api/v1/admin/payout-batches', { params: { ...filters, limit: 20 } }).then((r) => r.data.data),
  });

export const usePayoutBatch = (id: string) =>
  useQuery<PayoutBatchDetail>({
    queryKey: [...batchesKey, id],
    queryFn: () => api.get(`/api/v1/admin/payout-batches/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

export const useCreatePayoutBatch = () =>
  useMoneyWrite<CreatePayoutBatchInput, PayoutBatchDetail>(
    (body) => api.post('/api/v1/admin/payout-batches', body).then((r) => r.data.data),
    'Batch created',
  );

/** Downloads the bank-upload CSV (full account numbers, so it needs 2FA). */
export const useExportPayoutBatch = (id: string) =>
  useMoneyWrite<{ totpCode: string }>(async ({ totpCode }) => {
    const res = await api.post(`/api/v1/admin/payout-batches/${id}/export`, { totpCode }, { responseType: 'blob' });
    const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] ?? '')?.[1] ?? 'luvngift-payouts.csv';
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, 'Bank file downloaded');

export const useMarkTransferPaid = () =>
  useMoneyWrite<{ id: string; reference: string; note?: string; totpCode: string; proof: File }>(
    ({ id, reference, note, totpCode, proof }) => {
      const body = new FormData();
      body.append('reference', reference);
      if (note) body.append('note', note);
      body.append('totpCode', totpCode);
      body.append('proof', proof);
      return api.post(`/api/v1/admin/payout-transfers/${id}/paid`, body);
    },
    'Transfer recorded. The partner has been sent a statement.',
  );

export const useMarkTransferFailed = () =>
  useMoneyWrite<{ id: string } & TransferFailedInput>(
    ({ id, ...body }) => api.post(`/api/v1/admin/payout-transfers/${id}/failed`, body),
    'Transfer marked as not sent. Its items are due again.',
  );

export const usePartnerAdjustments = (filters: { status?: string; vendorId?: string; page: number }) =>
  useQuery<{ data: PartnerAdjustmentView[]; meta: { total: number; page: number; totalPages: number } }>({
    queryKey: [...adjustmentsKey, filters],
    queryFn: () => api.get('/api/v1/admin/partner-adjustments', { params: { ...filters, limit: 25 } }).then((r) => r.data.data),
  });

export const useCreateAdjustment = (vendorId: string) =>
  useMoneyWrite<PartnerAdjustmentInput>(
    (body) => api.post(`/api/v1/admin/partners/${vendorId}/adjustments`, body),
    'Adjustment added. The next batch will net it off.',
  );

export const useCancelAdjustment = () =>
  useMoneyWrite<{ id: string } & PayoutCancelInput>(
    ({ id, ...body }) => api.post(`/api/v1/admin/partner-adjustments/${id}/cancel`, body),
    'Adjustment cancelled',
  );

// ─── Reporting (phase 3) ─────────────────────────────────────────────────────

const reportsKey = ['admin', 'payout-reports'];
const fundingsKey = ['admin', 'payout-fundings'];

export const useMonthReport = (month: string) =>
  useQuery<MonthlyPayoutReport>({
    queryKey: [...reportsKey, month],
    queryFn: () => api.get('/api/v1/admin/payout-reports/month', { params: { month } }).then((r) => r.data.data),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });

function useReportWrite<T>(request: (input: T) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportsKey });
      qc.invalidateQueries({ queryKey: fundingsKey });
      qc.invalidateQueries({ queryKey: ['admin', 'order-money'] });
      toast.success(success);
    },
    onError: async (err: any) => toast.error(await blobErrorMessage(err, 'Could not save')),
  });
}

/** The month's payments as CSV, for the accountant (last four digits only). */
export const useDownloadMonthCsv = () =>
  useReportWrite<{ month: string }>(async ({ month }) => {
    const res = await api.get('/api/v1/admin/payout-reports/month/export', { params: { month }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luvngift-partner-payments-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'Downloaded');

export const useReconcileMonth = () =>
  useReportWrite<PayoutReconciliationInput>((body) => api.post('/api/v1/admin/payout-reports/reconciliations', body), 'Month reconciled');

export const usePayoutFundings = (page: number) =>
  useQuery<{ data: PayoutFundingView[]; meta: { total: number; page: number; totalPages: number } }>({
    queryKey: [...fundingsKey, page],
    queryFn: () => api.get('/api/v1/admin/payout-fundings', { params: { page, limit: 10 } }).then((r) => r.data.data),
  });

export const useAddFunding = () =>
  useReportWrite<PayoutFundingInput>((body) => api.post('/api/v1/admin/payout-fundings', body), 'Funding recorded');

export const useVoidFunding = () =>
  useReportWrite<{ id: string; reason: string }>(
    ({ id, reason }) => api.post(`/api/v1/admin/payout-fundings/${id}/void`, { reason }),
    'Funding record voided',
  );

export const usePartnerPayoutSummary = (vendorId: string) =>
  useQuery<PartnerPayoutSummary>({
    queryKey: ['admin', 'partner', vendorId, 'payout-summary'],
    queryFn: () => api.get(`/api/v1/admin/partners/${vendorId}/payout-summary`).then((r) => r.data.data),
    enabled: !!vendorId,
  });

export const useOrderMoney = (orderId: string) =>
  useQuery<OrderMoneyView>({
    queryKey: ['admin', 'order-money', orderId],
    queryFn: () => api.get(`/api/v1/admin/orders/${orderId}/money`).then((r) => r.data.data),
    enabled: !!orderId,
  });

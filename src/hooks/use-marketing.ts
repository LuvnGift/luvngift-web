'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import { api } from '@/lib/api';
import type {
  AdminMarketingIssueInput,
  FunnelMetrics,
  MarketingConsentSource,
  MarketingIssue,
  MarketingIssuePreview,
  MarketingPreference,
} from '@luvngift/shared';

const errorMessage = (err: any, fallback: string): string =>
  err?.response?.data?.error?.message ?? fallback;

const PREFERENCE_KEY = ['marketing', 'preference'] as const;

// ── The customer's own choice ────────────────────────────────────────────────

export const useMarketingPreference = (enabled = true) =>
  useQuery<MarketingPreference>({
    queryKey: PREFERENCE_KEY,
    queryFn: () => api.get('/api/v1/marketing/preference').then((r) => r.data.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

export const useSetMarketingPreference = () => {
  const qc = useQueryClient();
  return useMutation<MarketingPreference, Error, { optIn: boolean; source: MarketingConsentSource }>({
    mutationFn: (body) => api.put('/api/v1/marketing/preference', body).then((r) => r.data.data),
    onSuccess: (data, { optIn }) => {
      qc.setQueryData(PREFERENCE_KEY, data);
      toast.success(optIn ? 'You’re on the list. Look out for our next email.' : 'You won’t get marketing emails from us.');
    },
    onError: (err) => toast.error(errorMessage(err, 'That could not be saved. Please try again.')),
  });
};

export const useDismissMarketingPrompt = () => {
  const qc = useQueryClient();
  return useMutation<MarketingPreference, Error, void>({
    mutationFn: () => api.post('/api/v1/marketing/prompt-dismissed').then((r) => r.data.data),
    onSuccess: (data) => qc.setQueryData(PREFERENCE_KEY, data),
  });
};

// ── Unsubscribe link (no sign-in: the token is the credential) ──────────────
// Plain axios, not the shared client: there is no session to send or refresh.

export const useUnsubscribeStatus = (token: string) =>
  useQuery<{ optedIn: boolean }>({
    queryKey: ['marketing', 'unsubscribe', token],
    queryFn: () => axios.get(`/api/v1/marketing/u/${encodeURIComponent(token)}`).then((r) => r.data.data),
    retry: false,
  });

export const useUnsubscribe = (token: string) => {
  const qc = useQueryClient();
  return useMutation<{ optedIn: false }, Error, void>({
    mutationFn: () => axios.post(`/api/v1/marketing/u/${encodeURIComponent(token)}`).then((r) => r.data.data),
    onSuccess: (data) => qc.setQueryData(['marketing', 'unsubscribe', token], data),
    onError: (err) => toast.error(errorMessage(err, 'That did not work. Please try again.')),
  });
};

// ── Admin ────────────────────────────────────────────────────────────────────

export const useMarketingIssue = (weekOf: string) =>
  useQuery<MarketingIssue | null>({
    queryKey: ['admin', 'marketing', 'issue', weekOf],
    queryFn: () => api.get(`/api/v1/admin/marketing/issues/${weekOf}`).then((r) => r.data.data),
  });

export const useMarketingPreview = (weekOf: string) =>
  useQuery<MarketingIssuePreview>({
    queryKey: ['admin', 'marketing', 'preview', weekOf],
    queryFn: () => api.get(`/api/v1/admin/marketing/issues/${weekOf}/preview`).then((r) => r.data.data),
  });

export const useSaveMarketingIssue = (weekOf: string) => {
  const qc = useQueryClient();
  return useMutation<MarketingIssue, Error, AdminMarketingIssueInput>({
    mutationFn: (body) => api.put(`/api/v1/admin/marketing/issues/${weekOf}`, body).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'marketing'] });
      toast.success('Saved. This is what goes out on Thursday.');
    },
    onError: (err) => toast.error(errorMessage(err, 'The email could not be saved.')),
  });
};

export const useSendMarketingTest = (weekOf: string) =>
  useMutation<{ sentTo: string }, Error, void>({
    mutationFn: () => api.post(`/api/v1/admin/marketing/issues/${weekOf}/test`).then((r) => r.data.data),
    onSuccess: ({ sentTo }) => toast.success(`Test sent to ${sentTo}`),
    onError: (err) => toast.error(errorMessage(err, 'The test email could not be sent.')),
  });

export const useFunnel = (days = 30) =>
  useQuery<FunnelMetrics>({
    queryKey: ['admin', 'funnel', days],
    queryFn: () => api.get('/api/v1/admin/metrics/funnel', { params: { days } }).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { OrderConversation } from '@/lib/custom-orders';

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
    // The API explains a refusal (e.g. a custom order not yet paid) — show it.
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update status'),
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

/**
 * Result of asking Stripe for the true payment status of every PENDING order.
 *
 * Recovers orders stranded by the old webhook, which discarded Stripe retries
 * older than 5 minutes: the card was charged but the order never left PENDING,
 * so the buyer got no confirmation and no invoice.
 */
export interface ReconcileResult {
  scanned: number;
  recovered: string[];
  stillUnpaid: string[];
  /** Orders whose PaymentIntent exists only in Stripe test mode — unrecoverable. */
  testMode: string[];
  failed: { orderId: string; reason: string }[];
  dryRun: boolean;
}

export const useReconcilePayments = () => {
  const qc = useQueryClient();
  return useMutation<ReconcileResult, unknown, { dryRun: boolean }>({
    mutationFn: ({ dryRun }) =>
      api
        .post('/api/v1/admin/orders/reconcile-payments', null, { params: { dryRun } })
        .then((r) => r.data.data),
    onSuccess: (result) => {
      if (result.dryRun) return; // The dialog reports a preview; a toast would duplicate it.
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      toast.success(
        result.recovered.length
          ? `Recovered ${result.recovered.length} paid order${result.recovered.length === 1 ? '' : 's'}`
          : 'No stranded orders found',
      );
    },
    onError: () => toast.error('Could not reconcile payments'),
  });
};

export const useCancelTestModeOrders = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]) =>
      api
        .post('/api/v1/admin/orders/cancel-test-mode', { orderIds })
        .then((r) => r.data.data as { cancelled: string[] }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      toast.success(
        `Cancelled ${result.cancelled.length} test-mode order${result.cancelled.length === 1 ? '' : 's'}`,
      );
    },
    onError: () => toast.error('Could not cancel test-mode orders'),
  });
};

// ---------- Users ----------
export const useAdminUsers = (
  page = 1,
  limit = 20,
  opts: { search?: string; includeDeactivated?: boolean } = {},
) =>
  useQuery({
    queryKey: ['admin', 'users', page, limit, opts.search ?? '', opts.includeDeactivated ?? false],
    queryFn: () =>
      api
        .get('/api/v1/admin/users', {
          params: {
            page,
            limit,
            ...(opts.search ? { search: opts.search } : {}),
            ...(opts.includeDeactivated ? { includeDeactivated: 'true' } : {}),
          },
        })
        .then((r) => r.data.data),
    placeholderData: (prev: unknown) => prev,
  });

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role?: 'ADMIN' | 'CUSTOMER';
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  createdAt: string;
}

export const useAdmins = () =>
  useQuery<AdminUser[]>({
    queryKey: ['admin', 'admins'],
    queryFn: () => api.get('/api/v1/admin/users/admins').then((r) => r.data.data),
  });

/**
 * Exact-match lookup for the grant-admin flow. Not a search box — it is
 * admin-only and exact on purpose, so it cannot be used to enumerate customers.
 */
export const useLookupUserByEmail = () =>
  useMutation<AdminUser, any, string>({
    mutationFn: (email: string) =>
      api
        .get('/api/v1/admin/users/lookup', { params: { email } })
        .then((r) => r.data.data),
  });

/**
 * Promote to ADMIN or demote to CUSTOMER.
 *
 * The API refuses self-demotion and removing the last admin; both would lock
 * everyone out of the dashboard. Surface its message rather than a generic one,
 * because the reason is the useful part.
 */
export const useUpdateUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'ADMIN' | 'CUSTOMER' }) =>
      api.patch(`/api/v1/admin/users/${id}/role`, { role }).then((r) => r.data.data),
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'admins'] });
      toast.success(
        user.role === 'ADMIN'
          ? `${user.username} is now an admin`
          : `${user.username} is no longer an admin`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Could not change that user’s role'),
  });
};

export const useReactivateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/v1/admin/users/${id}/reactivate`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User reactivated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Could not reactivate that user'),
  });
};

export interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  createdAt: string;
}

export const useAuditLog = (page = 1, limit = 50) =>
  useQuery({
    queryKey: ['admin', 'audit', page, limit],
    queryFn: () =>
      api.get('/api/v1/admin/audit', { params: { page, limit } }).then((r) => r.data.data),
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
    // The API refuses to deactivate an admin account; say why rather than
    // failing silently.
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Could not deactivate that user'),
  });
};

// ---------- Chat support ----------
export const useEscalatedSessions = () =>
  useQuery({
    queryKey: ['admin', 'chat', 'sessions'],
    // Paginated server-side; the panel shows the newest page of open escalations.
    queryFn: () =>
      api
        .get('/api/v1/admin/chat/sessions', { params: { page: 1, limit: 50 } })
        .then((r) => r.data.data.data),
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

interface OccasionContentInput {
  seoIntro?: string;
  highlights?: string[];
  faqs?: { question: string; answer: string }[];
}

export const useCreateOccasion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description: string; image?: string } & OccasionContentInput) =>
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
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; image?: string; isActive?: boolean } & OccasionContentInput) =>
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
      seoBody?: string;
      faqs?: { question: string; answer: string }[];
    }) => api.post('/api/v1/admin/bundles', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bundles'] });
      toast.success('Bundle created');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create bundle');
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
      seoBody?: string;
      faqs?: { question: string; answer: string }[];
    }) => api.patch(`/api/v1/admin/bundles/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bundles'] });
      toast.success('Bundle updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update bundle');
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
    queryFn: () =>
      api
        .get('/api/v1/admin/reviews', { params: { page: 1, limit: 50 } })
        .then((r) => r.data.data.data),
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

// ---------- Vendor assignment ----------
export const useAssignVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, vendorId }: { orderId: string; vendorId: string }) =>
      api.patch(`/api/v1/admin/orders/${orderId}/vendor`, { vendorId }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      toast.success('Vendor assigned — they will be notified by email and SMS');
    },
    // The API explains WHY it refused (e.g. a custom order not yet accepted or
    // paid), and that reason is the whole point — don't swap it for a generic one.
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to assign vendor'),
  });
};

// ---------- Custom gift requests ----------

export const useAdminOrderConversation = (orderId: string, enabled = true) =>
  useQuery<OrderConversation>({
    queryKey: ['admin', 'orders', orderId, 'conversation'],
    queryFn: () =>
      api.get(`/api/v1/admin/orders/${orderId}/conversation`).then((r) => r.data.data),
    enabled: !!orderId && enabled,
  });

export const useAdminSendOrderMessage = (orderId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post(`/api/v1/admin/orders/${orderId}/messages`, { body }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders', orderId, 'conversation'] });
      toast.success('Sent — the customer has been emailed');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Message could not be sent'),
  });
};

export const useSendQuote = (orderId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quote: { subtotal: number; scope: string; note?: string; isFinal: boolean }) =>
      api.post(`/api/v1/admin/orders/${orderId}/quotes`, quote).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      toast.success('Quote sent — the customer has been emailed');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message ?? 'Quote could not be sent');
      qc.invalidateQueries({ queryKey: ['admin', 'orders', orderId, 'conversation'] });
    },
  });
};

// ---------- Vendor status link ----------

export interface VendorLinkState {
  assigned: boolean;
  vendor?: { id: string; name: string };
  link: {
    issuedAt: string;
    expiresAt: string;
    lastUsedAt: string | null;
    expired: boolean;
    vendorEmail: string;
    vendorPhone: string;
  } | null;
}

/**
 * Describes the order's vendor link. There is no URL in this response and
 * there cannot be — the API stores only a hash of the token, so a link is
 * unrecoverable once it has been sent. `lastUsedAt === null` is the useful
 * signal: the vendor has never opened the work.
 */
export const useVendorLink = (orderId: string, enabled = true) =>
  useQuery<VendorLinkState>({
    queryKey: ['admin', 'vendor-link', orderId],
    queryFn: () =>
      api.get(`/api/v1/admin/orders/${orderId}/vendor-link`).then((r) => r.data.data),
    enabled: enabled && !!orderId,
    // Cheap and the whole point is freshness — an admin opens this panel
    // precisely to find out whether the vendor has looked yet.
    staleTime: 0,
  });

/**
 * Replaces the link. `notify: true` re-sends it by email and SMS; `false`
 * returns a copyable URL for pasting into WhatsApp. Either way the previous
 * link stops working immediately, so this is never a silent operation.
 */
export const useReissueVendorLink = (orderId: string) => {
  const qc = useQueryClient();
  return useMutation<{ sent: boolean; url: string | null }, unknown, { notify: boolean }>({
    mutationFn: ({ notify }) =>
      api
        .post(`/api/v1/admin/orders/${orderId}/vendor-link`, { notify })
        .then((r) => r.data.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'vendor-link', orderId] });
      if (data.sent) toast.success('Link resent to the vendor by email and SMS');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Could not issue a new link'),
  });
};

// ---------- Vendors ----------
export interface VendorInput {
  name: string;
  contactName?: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  businessType: 'RETAIL' | 'DELIVERY' | 'LOGISTICS';
  notes?: string;
}

export type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const useVendors = (
  page = 1,
  limit = 20,
  search = '',
  includeInactive = false,
  status?: VendorStatus,
) =>
  useQuery({
    queryKey: ['admin', 'vendors', page, limit, search, includeInactive, status],
    queryFn: () =>
      api
        .get('/api/v1/vendors', {
          params: { page, limit, search: search || undefined, includeInactive, status },
        })
        .then((r) => r.data.data),
  });

export const useVendor = (id: string | null) =>
  useQuery({
    queryKey: ['admin', 'vendors', id],
    queryFn: () => api.get(`/api/v1/vendors/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

export const useVendorOrders = (vendorId: string | null, page = 1) =>
  useQuery({
    queryKey: ['admin', 'vendors', vendorId, 'orders', page],
    queryFn: () =>
      api.get(`/api/v1/vendors/${vendorId}/orders`, { params: { page } }).then((r) => r.data.data),
    enabled: !!vendorId,
  });

export const useCreateVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VendorInput) =>
      api.post('/api/v1/vendors', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      toast.success('Vendor created');
    },
    onError: () => toast.error('Failed to create vendor'),
  });
};

export const useUpdateVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<VendorInput> & { id: string }) =>
      api.patch(`/api/v1/vendors/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      toast.success('Vendor updated');
    },
    onError: () => toast.error('Failed to update vendor'),
  });
};

export const useSetVendorActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive, reason }: { id: string; isActive: boolean; reason?: string }) =>
      api.patch(`/api/v1/vendors/${id}/active`, { isActive, reason }).then((r) => r.data.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      toast.success(vars.isActive ? 'Vendor reactivated — they have been notified' : 'Vendor deactivated — they have been notified');
    },
    onError: () => toast.error('Failed to update vendor status'),
  });
};

export const useSetVendorStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      api.patch(`/api/v1/vendors/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      toast.success(vars.status === 'APPROVED' ? 'Vendor approved' : 'Application rejected');
    },
    onError: () => toast.error('Failed to update application'),
  });
};

// ---------- Roadmap ----------
export type RoadmapStatus = 'PLANNED' | 'IN_PROGRESS' | 'LAUNCHED';

export interface RoadmapItemInput {
  title: string;
  description: string;
  category?: string;
  status?: RoadmapStatus;
  targetLabel?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Delivery proof & substitutions ───────────────────────────────────────────

export const useAttachDeliveryProof = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, file, note }: { orderId: string; file: File; note?: string }) => {
      const form = new FormData();
      form.append('photo', file);
      if (note) form.append('note', note);
      return api
        .post(`/api/v1/admin/orders/${orderId}/delivery-proof`, form)
        .then((r) => r.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'order'] });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      toast.success('Delivery proof saved — order marked delivered');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to upload photo'),
  });
};

export interface SubstitutionRecord {
  orderItemId: string;
  deliveredName?: string;
  substitutedForName?: string;
  substitutionReason?: string;
  isOmitted?: boolean;
}

export const useRecordSubstitutions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: SubstitutionRecord[] }) =>
      api.post(`/api/v1/admin/orders/${orderId}/substitutions`, { items }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'order'] });
      toast.success('Substitutions recorded — customer notified');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to record substitutions'),
  });
};

// ─── Subscription plans ───────────────────────────────────────────────────────

export interface PlanPriceInput {
  interval: 'MONTHLY' | 'BIWEEKLY';
  currency: 'CAD' | 'USD' | 'GBP';
  amount: number;
}

export interface PlanInput {
  name: string;
  description: string;
  slotCount: number;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
  prices: PlanPriceInput[];
}

export const useAdminPlans = (page = 1, limit = 50) =>
  useQuery({
    queryKey: ['admin', 'subscription-plans', page, limit],
    queryFn: () =>
      api
        .get('/api/v1/admin/subscription-plans', { params: { page, limit } })
        .then((r) => r.data.data),
  });

export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PlanInput) =>
      api.post('/api/v1/admin/subscription-plans', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      qc.invalidateQueries({ queryKey: ['subscriptions', 'plans'] });
      toast.success('Plan created — Stripe product and prices set up');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create plan'),
  });
};

export const useUpdatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Omit<PlanInput, 'prices'> & { id: string }) =>
      api.patch(`/api/v1/admin/subscription-plans/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      qc.invalidateQueries({ queryKey: ['subscriptions', 'plans'] });
      toast.success('Plan updated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update plan'),
  });
};

export const useDeletePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/admin/subscription-plans/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      qc.invalidateQueries({ queryKey: ['subscriptions', 'plans'] });
      toast.success('Plan deactivated');
    },
  });
};

// ─── Subscription catalogue items ─────────────────────────────────────────────

export interface CatalogueItemInput {
  name: string;
  description?: string;
  price: number;
  currency?: 'CAD' | 'USD' | 'GBP' | 'NGN';
  category: string;
  stock?: number;
  isActive?: boolean;
  availableStates?: string[];
}

export const useAdminCatalogueItems = (page = 1, limit = 50) =>
  useQuery({
    queryKey: ['admin', 'catalogue-items', page, limit],
    queryFn: () =>
      api.get('/api/v1/admin/catalogue-items', { params: { page, limit } }).then((r) => r.data.data),
  });

export const useCreateCatalogueItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CatalogueItemInput) =>
      api.post('/api/v1/admin/catalogue-items', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'catalogue-items'] });
      toast.success('Item added to the catalogue');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create item'),
  });
};

export const useUpdateCatalogueItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: CatalogueItemInput & { id: string }) =>
      api.patch(`/api/v1/admin/catalogue-items/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'catalogue-items'] });
      toast.success('Item updated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update item'),
  });
};

export const useDeleteCatalogueItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/admin/catalogue-items/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'catalogue-items'] });
      toast.success('Item deactivated');
    },
  });
};

export const useAdminRoadmap = (page = 1, limit = 50) =>
  useQuery({
    queryKey: ['admin', 'roadmap', page, limit],
    queryFn: () =>
      api.get('/api/v1/admin/roadmap', { params: { page, limit } }).then((r) => r.data.data),
  });

export const useCreateRoadmapItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RoadmapItemInput) =>
      api.post('/api/v1/admin/roadmap', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      qc.invalidateQueries({ queryKey: ['roadmap'] });
      toast.success('Roadmap item created');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to create item'),
  });
};

export const useUpdateRoadmapItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: RoadmapItemInput & { id: string }) =>
      api.patch(`/api/v1/admin/roadmap/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      qc.invalidateQueries({ queryKey: ['roadmap'] });
      toast.success('Roadmap item updated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update item'),
  });
};

export const useDeleteRoadmapItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/admin/roadmap/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      qc.invalidateQueries({ queryKey: ['roadmap'] });
      toast.success('Roadmap item deleted');
    },
  });
};

// ---------- Careers (jobs) ----------
export type JobEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'REMOTE';
export type JobStatus = 'OPEN' | 'CLOSED';
export type ApplicationStatus = 'NEW' | 'REVIEWING' | 'INTERVIEW' | 'REJECTED' | 'HIRED';

export interface JobInput {
  title: string;
  department?: string;
  location?: string;
  employmentType?: JobEmploymentType;
  description: string;
  status?: JobStatus;
}

export const useAdminJobs = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ['admin', 'jobs', page, limit],
    queryFn: () =>
      api.get('/api/v1/admin/jobs', { params: { page, limit } }).then((r) => r.data.data),
  });

export const useCreateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: JobInput) => api.post('/api/v1/admin/jobs', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      toast.success('Job posted');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to post job'),
  });
};

export const useUpdateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: JobInput & { id: string }) =>
      api.patch(`/api/v1/admin/jobs/${id}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      toast.success('Job updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? 'Failed to update job'),
  });
};

export const useDeleteJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/jobs/${id}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      toast.success('Job removed');
    },
  });
};

export const useJobApplications = (page = 1, limit = 20, jobId?: string) =>
  useQuery({
    queryKey: ['admin', 'jobs', 'applications', page, limit, jobId ?? null],
    queryFn: () =>
      api
        .get('/api/v1/admin/jobs/applications', { params: { page, limit, jobId: jobId || undefined } })
        .then((r) => r.data.data),
  });

export const useUpdateApplicationStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api.patch(`/api/v1/admin/jobs/applications/${id}/status`, { status }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs', 'applications'] });
      toast.success('Application updated');
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

export interface DeliveryWindowSettings {
  leadDays: number;
  windowDays: number;
  defaults: { leadDays: number; windowDays: number };
}

export const useDeliveryWindow = () =>
  useQuery<DeliveryWindowSettings>({
    queryKey: ['admin', 'settings', 'delivery-window'],
    queryFn: () => api.get('/api/v1/admin/settings/delivery-window').then((r) => r.data.data),
  });

export const useUpdateDeliveryWindow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { leadDays: number; windowDays: number }) =>
      api.put('/api/v1/admin/settings/delivery-window', data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings', 'delivery-window'] });
      toast.success('Delivery window updated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update delivery window'),
  });
};

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

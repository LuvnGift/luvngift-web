'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  CreateReviewInput,
  OwnReview,
  PaginatedResponse,
  PublicReview,
} from '@luvngift/shared';

const errorMessage = (err: any, fallback: string): string =>
  err?.response?.data?.error?.message ?? fallback;

const PAGE_SIZE = 5;

/** A bundle's approved reviews, five at a time, for "Show more". */
export const useBundleReviews = (bundleId: string) =>
  useInfiniteQuery<PaginatedResponse<PublicReview>>({
    queryKey: ['reviews', 'bundle', bundleId],
    queryFn: ({ pageParam }) =>
      api
        .get(`/api/v1/reviews/bundles/${bundleId}`, { params: { page: pageParam, limit: PAGE_SIZE } })
        .then((r) => r.data.data),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled: !!bundleId,
  });

/** The home page strip: reviews an admin chose to feature. */
export const useFeaturedReviews = (limit = 6) =>
  useQuery<PublicReview[]>({
    queryKey: ['reviews', 'featured', limit],
    queryFn: () =>
      api
        .get('/api/v1/reviews', { params: { featured: 'true', page: 1, limit } })
        .then((r) => r.data.data.data),
    staleTime: 5 * 60 * 1000,
  });

export const useCreateReview = (orderId: string) => {
  const qc = useQueryClient();
  return useMutation<OwnReview, Error, Omit<CreateReviewInput, 'orderId'>>({
    mutationFn: (body) => api.post('/api/v1/reviews', { ...body, orderId }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', orderId] });
      toast.success('Thank you! Your review will appear once we have checked it.');
    },
    onError: (err) => toast.error(errorMessage(err, 'Your review could not be sent.')),
  });
};

export const useDeleteReview = (orderId: string) => {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (reviewId) => api.delete(`/api/v1/reviews/${reviewId}`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', orderId] });
      toast.success('Your review was deleted.');
    },
    onError: (err) => toast.error(errorMessage(err, 'Your review could not be deleted.')),
  });
};

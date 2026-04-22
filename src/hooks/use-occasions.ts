'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Occasion, Bundle } from '@luvngift/shared';

export const useOccasions = () =>
  useQuery<Occasion[]>({
    queryKey: ['occasions'],
    queryFn: () => api.get('/api/v1/occasions').then((r) => r.data.data),
  });

export const useOccasionBySlug = (slug: string) =>
  useQuery<Occasion>({
    queryKey: ['occasions', slug],
    queryFn: () => api.get(`/api/v1/occasions/${slug}`).then((r) => r.data.data),
    enabled: !!slug,
  });

export const useBundlesByOccasion = (occasionId: string) =>
  useQuery<Bundle[]>({
    queryKey: ['bundles', 'occasion', occasionId],
    queryFn: () => api.get('/api/v1/bundles', { params: { occasionId } }).then((r) => r.data.data),
    enabled: !!occasionId,
  });

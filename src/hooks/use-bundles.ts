'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Bundle } from '@luvngift/shared';

export const useBundle = (id: string) =>
  useQuery<Bundle>({
    queryKey: ['bundles', id],
    queryFn: () => api.get(`/api/v1/bundles/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { LoginInput, RegisterInput } from '@celebrate4me/shared';

export const useLogin = () => {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (data: LoginInput) => api.post('/auth/login', data).then(r => r.data.data),
    onSuccess: (data) => {
      setAuth(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      connectSocket(data.accessToken);
      router.push('/occasions');
    },
  });
};

export const useRegister = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: RegisterInput) => api.post('/auth/register', data).then(r => r.data.data),
    onSuccess: () => router.push('/login?registered=true'),
  });
};

export const useLogout = () => {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  return useMutation({
    mutationFn: () => api.post('/auth/logout').then(r => r.data),
    onSuccess: () => {
      clearAuth();
      disconnectSocket();
      router.push('/login');
    },
  });
};

export const useMe = () => {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then(r => r.data.data),
    enabled: !!accessToken,
  });
};

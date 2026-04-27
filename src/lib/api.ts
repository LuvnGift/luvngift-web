import axios from 'axios';

// baseURL is intentionally empty — all requests use relative paths (/api/v1/...)
// so they go through the Next.js proxy (next.config.ts rewrites). This makes
// cookies first-party to the web domain, fixing ITP cookie blocking on iOS Safari.
export const api = axios.create({
  baseURL: '',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await api.post('/api/v1/auth/refresh', {});
        return api(originalRequest);
      } catch {
        if (typeof window !== 'undefined') {
          const { useAuthStore } = await import('@/store/auth.store');
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

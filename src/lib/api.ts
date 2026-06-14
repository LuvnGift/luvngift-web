import axios from 'axios';

// baseURL is intentionally empty — all requests use relative paths (/api/v1/...)
// so they go through the Next.js proxy (next.config.ts rewrites). This makes
// cookies first-party to the web domain, fixing ITP cookie blocking on iOS Safari.
export const api = axios.create({
  baseURL: '',
  withCredentials: true,
});

// Single-flight refresh guard. Refresh tokens are single-use/rotated server-side,
// so concurrent 401s must NOT each fire their own /auth/refresh — the first would
// rotate the token and the rest would present a now-deleted token, getting logged
// out. All callers that 401 share one in-flight refresh promise instead.
let refreshPromise: Promise<unknown> | null = null;

async function refreshSession(): Promise<unknown> {
  if (!refreshPromise) {
    refreshPromise = api.post('/api/v1/auth/refresh', {}).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Never try to refresh off a failed refresh call — that would loop.
    const isRefreshCall = originalRequest?.url?.includes('/api/v1/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return await api(originalRequest);
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

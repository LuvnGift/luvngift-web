import axios from 'axios';

// baseURL is intentionally empty — all requests use relative paths (/api/v1/...)
// so they go through the Next.js proxy (next.config.ts rewrites). This makes
// cookies first-party to the web domain, fixing ITP cookie blocking on iOS Safari.
/**
 * Default request timeout.
 *
 * There was none, so any request that hung — a Railway cold start, a dropped
 * connection — hung forever, leaving spinners and skeletons on screen with no
 * error and nothing in any log. 20s is generous for a cold start while still
 * being an upper bound. Individual calls can override it; the exchange-rate
 * fetch uses a much shorter one because prices block on it.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

export const api = axios.create({
  baseURL: '',
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
});

/**
 * Correlation id, so one identifier spans the browser, the Next.js proxy and
 * the Express API. Without it a failure on screen and a line in Railway's logs
 * could not be shown to be the same event.
 */
function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Older Safari, and any non-secure context.
    return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

api.interceptors.request.use((config) => {
  config.headers['x-request-id'] ??= newRequestId();
  return config;
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

    // Never try to refresh off an auth endpoint — /auth/login, /auth/refresh etc.
    // all legitimately return 401 and should surface as normal errors to the caller.
    const isAuthCall = originalRequest?.url?.includes('/api/v1/auth/');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthCall) {
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
    // Observability is split: Sentry watches the browser, Axiom holds the API's
    // logs. The correlation id is the join between them, so it must reach
    // Sentry — otherwise a frontend error and the backend request that caused
    // it can never be matched up.
    if (typeof window !== 'undefined') {
      const requestId = error.config?.headers?.['x-request-id'];
      const isTimeout = error.code === 'ECONNABORTED';
      const status = error.response?.status;
      const summary =
        `[api] ${originalRequest?.method?.toUpperCase() ?? 'REQ'} ${originalRequest?.url ?? '?'} ` +
        `${isTimeout ? 'timed out' : `failed (${status ?? 'network'})`} ` +
        `[request-id: ${requestId ?? 'none'}]`;
      console.error(summary);

      // 401s are routine (expired access token, handled above) and 4xx is the
      // caller's problem — reporting those would bury the real failures.
      const worthReporting = isTimeout || !status || status >= 500;
      if (worthReporting && requestId) {
        void import('@sentry/nextjs')
          .then((Sentry) => {
            Sentry.withScope((scope) => {
              scope.setTag('requestId', String(requestId));
              scope.setContext('api', {
                url: originalRequest?.url,
                method: originalRequest?.method,
                status: status ?? 'network',
                timedOut: isTimeout,
              });
              Sentry.captureException(error);
            });
          })
          .catch(() => {
            /* Sentry absent or not configured — the console line still stands. */
          });
      }
    }
    return Promise.reject(error);
  },
);

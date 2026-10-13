import * as Sentry from '@sentry/nextjs';

/**
 * Browser-side error reporting. Inert unless NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * Separate from the server DSN because this value is inlined into the client
 * bundle and is therefore public. Sentry DSNs are designed to be public —
 * they only permit writing events — but it still has to be a NEXT_PUBLIC_ var
 * to reach the browser at all.
 *
 * This catches what no server-side tool can: a checkout that breaks in one
 * person's browser, which until now produced no signal anywhere.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    tracesSampleRate: 0,
    // Browser extensions and cross-origin scripts generate a lot of noise that
    // is not ours and not actionable.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
      }
      return event;
    },
  });
}

/** Reports navigation timing to Sentry; harmless and a no-op when uninitialised. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

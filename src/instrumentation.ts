import * as Sentry from '@sentry/nextjs';

/**
 * Server-side error reporting for the web app. Inert unless SENTRY_DSN is set.
 *
 * Optional by design, matching the API: a required variable would break the
 * deploy that introduces it. With no DSN nothing initialises and every hook
 * below is a no-op.
 *
 * This is where server-render failures surface — the class of problem behind
 * the production 404, where a render failed and the only evidence was the page
 * the visitor saw.
 */
export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    // Errors are what this was turned on for; tracing is a separate cost and a
    // separate decision.
    tracesSampleRate: 0,
    beforeSend(event) {
      // Request bodies and headers on this side carry session cookies and
      // recipient details, none of which help diagnose a stack trace.
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      return event;
    },
  });
}

/**
 * Next calls this for errors thrown during a server render. Without it, a
 * failed render is reported only as whatever the visitor happened to see.
 */
export const onRequestError = Sentry.captureRequestError;

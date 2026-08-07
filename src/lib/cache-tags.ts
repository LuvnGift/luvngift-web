/**
 * Cache tag names, shared by the fetches that read data and the API that purges
 * it after an admin edit.
 *
 * These strings are a contract with `luvngift-api/src/services/revalidate.service.ts`.
 * **Change them in both places or a purge silently stops working** — nothing
 * fails loudly, the page just goes stale until the 1-hour fallback expires.
 */

export const CACHE_TAGS = {
  bundles: 'bundles',
  bundle: (slug: string) => `bundle:${slug}`,
  occasions: 'occasions',
  occasion: (slug: string) => `occasion:${slug}`,
  jobs: 'jobs',
  job: (slug: string) => `job:${slug}`,
  roadmap: 'roadmap',
  subscriptionPlans: 'subscription-plans',
} as const;

/**
 * Time-based fallback, in seconds. Tags do the real work; this only catches
 * anything a purge misses (a failed callback, a mutation path we forgot).
 */
export const CACHE_FALLBACK_SECONDS = 3600;

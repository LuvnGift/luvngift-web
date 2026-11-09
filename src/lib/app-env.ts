/**
 * NEXT_PUBLIC_APP_ENV=staging marks a staging build: it shows the banner at
 * the top of every page and tells search engines not to index the site.
 * Set it on Vercel's Preview environment only. It is read at build time,
 * so changing it needs a redeploy.
 */
export const isStaging = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() === 'staging';

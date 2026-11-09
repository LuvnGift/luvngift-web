import { isStaging } from '@/lib/app-env';

/** A strip across the top of every page on staging, so nobody mistakes it for the live site. */
export function StagingBanner() {
  if (!isStaging) return null;
  return (
    <div
      role="note"
      className="w-full bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950 sm:text-sm"
    >
      STAGING: test site. Payments use Stripe test cards, and every email and text goes to the team, not to customers.
    </div>
  );
}

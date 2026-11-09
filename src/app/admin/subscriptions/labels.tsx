import type { SubscriptionStatus } from '@/hooks/use-admin';
import { cadenceTitle } from '@/lib/cadence';

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  PAST_DUE: 'Past due',
  CANCELLED: 'Cancelled',
};

const STATUS_TONE: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-gray-100 text-gray-700',
  PAST_DUE: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function StatusPill({ status }: { status: SubscriptionStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function NotePill({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'amber' | 'red' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export const cadenceLabel = (interval: string) => cadenceTitle(interval);

export const personName = (u: { email: string; firstName: string | null; lastName: string | null }) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Matches the order reference everywhere else in admin and in email. */
export const orderRef = (id: string) => `#${id.slice(-8).toUpperCase()}`;

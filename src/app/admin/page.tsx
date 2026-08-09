'use client';

import Link from 'next/link';
import {
  ShoppingCart,
  DollarSign,
  MessageSquare,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  RefreshCcw,
  UserCheck,
  Camera,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminMetrics } from '@/hooks/use-admin';

/**
 * Admin dashboard.
 *
 * Structured "what needs doing" first, "how are we doing" second — an ops
 * console is read to decide the next action, not to admire totals.
 *
 * Data-dense layout: tight spacing, tabular numerals so figures align, and no
 * decorative chrome. Uses the app's existing semantic tokens rather than a
 * dashboard-specific palette, so admin still looks like Luvngift.
 */

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£' };

function money(cents: number, currency = 'USD') {
  return `${SYMBOLS[currency] ?? ''}${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function signedCad(cents: number) {
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
  return `${sign}CA$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// ─── Needs attention ──────────────────────────────────────────────────────────

interface QueueItem {
  label: string;
  count: number;
  href: string;
  icon: typeof ShoppingCart;
  hint: string;
}

function AttentionQueue({ items }: { items: QueueItem[] }) {
  const outstanding = items.filter((i) => i.count > 0);

  if (outstanding.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>Nothing needs attention right now.</span>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {outstanding.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors duration-200 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900 tabular-nums">
              {item.count} {item.label}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80">{item.hint}</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-amber-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatProps {
  title: string;
  value: string;
  href: string;
  icon: typeof ShoppingCart;
  sub?: string;
  trend?: { delta: number; label: string } | null;
  tone?: 'default' | 'negative';
}

function Stat({ title, value, href, icon: Icon, sub, trend, tone = 'default' }: StatProps) {
  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card p-4 transition-colors duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </div>

      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          tone === 'negative' ? 'text-red-600' : ''
        }`}
      >
        {value}
      </p>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${
              trend.delta > 0 ? 'text-green-700' : trend.delta < 0 ? 'text-red-600' : ''
            }`}
          >
            {trend.delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : trend.delta < 0 ? (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            ) : null}
            {trend.delta > 0 ? '+' : ''}
            {trend.delta}
          </span>
        )}
        <span>{trend ? trend.label : sub}</span>
      </div>
    </Link>
  );
}

function StatSkeleton() {
  // Same box model as Stat so nothing shifts when data lands (CLS).
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-7 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: metrics, isLoading } = useAdminMetrics();

  const orderDelta = (metrics?.ordersToday ?? 0) - (metrics?.ordersYesterday ?? 0);
  const fxAbsorbed = metrics?.refundFxAbsorbedCad ?? 0;

  const queue: QueueItem[] = [
    {
      label: 'orders need a vendor',
      count: metrics?.unassignedOrders ?? 0,
      href: '/admin/orders',
      icon: UserCheck,
      hint: 'Paid and waiting on assignment',
    },
    {
      label: 'chats escalated',
      count: metrics?.pendingChats ?? 0,
      href: '/admin/chat',
      icon: MessageSquare,
      hint: 'A customer is waiting for a human',
    },
    {
      label: 'subscriptions past due',
      count: metrics?.pastDueSubscriptions ?? 0,
      href: '/admin/orders',
      icon: AlertTriangle,
      hint: 'Stripe is retrying — chase the subscriber',
    },
    {
      label: 'deliveries lack a photo',
      count: metrics?.undeliveredProof ?? 0,
      href: '/admin/orders',
      icon: Camera,
      hint: 'Shipped but proof not uploaded',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          What needs doing, and how the platform is tracking.
        </p>
      </div>

      {/* Needs attention — first, because it's the reason to open this page */}
      <section aria-labelledby="attention-heading" className="space-y-2">
        <h2 id="attention-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Needs attention
        </h2>
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : (
          <AttentionQueue items={queue} />
        )}
      </section>

      {/* Health */}
      <section aria-labelledby="health-heading" className="space-y-2">
        <h2 id="health-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Today
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <Stat
                title="Orders today"
                value={String(metrics?.ordersToday ?? 0)}
                href="/admin/orders"
                icon={ShoppingCart}
                trend={{ delta: orderDelta, label: 'vs yesterday' }}
              />
              <Stat
                title="New users"
                value={String(metrics?.newUsers ?? 0)}
                href="/admin/users"
                icon={UserPlus}
                sub="Signed up today"
              />
              <Stat
                title="Active subscriptions"
                value={String(metrics?.activeSubscriptions ?? 0)}
                href="/admin/subscription-plans"
                icon={Repeat}
                sub="Billing normally"
              />
              <Stat
                title="Total revenue"
                value={money(metrics?.totalRevenue ?? 0)}
                href="/admin/orders"
                icon={DollarSign}
                sub="All succeeded payments"
              />
              <Stat
                title="Refund FX absorbed"
                value={signedCad(fxAbsorbed)}
                href="/admin/orders"
                icon={RefreshCcw}
                tone={fxAbsorbed < 0 ? 'negative' : 'default'}
                sub={`Across ${metrics?.refundCount ?? 0} refund${metrics?.refundCount === 1 ? '' : 's'}`}
              />
            </>
          )}
        </div>
      </section>

      {/* Revenue is summed across currencies — say so rather than imply one currency. */}
      <p className="text-xs text-muted-foreground">
        Revenue totals the amount captured on every succeeded payment, in each order&apos;s own
        currency. Treat it as volume, not a converted figure.
      </p>
    </div>
  );
}

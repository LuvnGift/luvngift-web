'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  useMaintenanceStatus,
  useRunMaintenance,
  type MaintenanceTask,
  type MaintenanceTaskStatus,
} from '@/hooks/use-admin';

/** What each task does and which promise it keeps, in plain words. */
const TASKS: Record<MaintenanceTask, { title: string; when: string; what: string; promise: string }> = {
  'retention:sweep': {
    title: 'Data retention cleanup',
    when: 'Every day at 03:00 UTC',
    what: 'Deletes guest support chats with no messages for 24 months, job applications (and their CV files) 12 months after the role closed, and rejected vendor applications after 12 months.',
    promise: 'Privacy Policy § 6',
  },
  'subscriptions:apply-price-changes': {
    title: 'Apply scheduled price changes',
    when: 'Every day at 01:00 UTC',
    what: 'Moves existing subscribers to a new price once its effective date arrives. Changes are scheduled by publishing a plan’s pricing.',
    promise: 'Terms § 9',
  },
  'subscriptions:margin-check': {
    title: 'Subscription margin check',
    when: 'Every day at 12:00 UTC',
    what: "Re-prices every live subscription price at today's exchange rate and emails you about any whose markup has fallen more than the tolerance below its plan's. Republish the plan's pricing to fix it.",
    promise: 'Pricing',
  },
  'refunds:timeliness': {
    title: 'Refund deadline check',
    when: 'Weekdays at 13:00 UTC',
    what: 'Emails you about refund requests older than 5 business days, and refunds Stripe has not settled after 5 business days.',
    promise: 'Refund Policy § 7',
  },
};

const RESULT_LABELS: Record<string, string> = {
  guestChats: 'Guest chats',
  jobApplications: 'Job applications',
  jobApplicationFailures: 'Applications that could not be deleted',
  rejectedVendors: 'Rejected vendor applications',
  changes: 'Price changes due',
  moved: 'Subscribers moved',
  failed: 'Subscribers that failed (retried tomorrow)',
  overdueRequests: 'Overdue refund requests',
  stuckRefunds: 'Unsettled refunds',
  checked: 'Plans checked',
  belowMargin: 'Prices below target margin',
};

function ResultSummary({ result }: { result: unknown }) {
  if (!result || typeof result !== 'object') return null;
  const entries = Object.entries(result as Record<string, unknown>).filter(([k]) => k in RESULT_LABELS);
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{RESULT_LABELS[k]}</dt>
          <dd className="text-right font-medium tabular-nums">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString();

function TaskCard({ status }: { status: MaintenanceTaskStatus }) {
  const meta = TASKS[status.task];
  const run = useRunMaintenance();
  const [latest, setLatest] = useState<{ dryRun: boolean; ranAt: string; result: unknown } | null>(null);
  const isRetention = status.task === 'retention:sweep';

  const trigger = (dryRun: boolean) => {
    if (isRetention && !dryRun && !confirm('Run the retention cleanup now? Anything past its retention limit is permanently deleted.')) {
      return;
    }
    run.mutate({ task: status.task, dryRun }, { onSuccess: (data) => setLatest(data) });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{meta.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.when} · keeps {meta.promise}</p>
          </div>
          <div className="flex gap-2">
            {isRetention && (
              <Button size="sm" variant="outline" onClick={() => trigger(true)} disabled={run.isPending}>
                Preview
              </Button>
            )}
            <Button size="sm" onClick={() => trigger(false)} disabled={run.isPending}>
              {run.isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Run now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">{meta.what}</p>

        {latest && (
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="font-medium">
              {latest.dryRun ? 'Preview — nothing was deleted' : 'Ran just now'} ({when(latest.ranAt)})
            </p>
            <ResultSummary result={latest.result} />
            {latest.dryRun && (
              <p className="mt-2 text-xs text-muted-foreground">Counts show up to 200 per type.</p>
            )}
          </div>
        )}

        <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <p>Next scheduled run: <span className="text-foreground">{status.nextRunAt ? when(status.nextRunAt) : '—'}</span></p>
          <p className="flex items-center gap-1">
            Last scheduled run:{' '}
            {status.lastRun ? (
              <span className="flex items-center gap-1 text-foreground">
                {status.lastRun.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-label="Succeeded" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-600" aria-label="Failed" />
                )}
                {when(status.lastRun.finishedAt)}
              </span>
            ) : (
              <span className="text-foreground">not yet</span>
            )}
          </p>
        </div>
        {status.lastRun && !status.lastRun.ok && status.lastRun.error && (
          <p className="text-xs text-red-700">Last run failed: {status.lastRun.error}</p>
        )}
        {status.lastRun?.ok && <ResultSummary result={status.lastRun.result} />}
      </CardContent>
    </Card>
  );
}

/**
 * The automated tasks that keep published promises (retention, price-change
 * notice, refund deadline). They run on their own; this page shows that they
 * did, and lets an admin run one now or preview the retention cleanup.
 */
export default function AdminMaintenancePage() {
  const { data, isLoading, isError } = useMaintenanceStatus();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <p className="text-sm text-muted-foreground">
          Automated tasks that keep our privacy, refund and subscription promises. They run on their
          own — use this page to check they ran, or to run one now.
        </p>
      </div>

      {data && !data.redisAvailable && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <p>The job queue (Redis) is not connected, so nothing is scheduled right now. You can still run a task by hand.</p>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-10"><Spinner /></div>}
      {isError && <p className="text-sm text-destructive">Could not load maintenance status.</p>}
      {data?.tasks.map((t) => <TaskCard key={t.task} status={t} />)}
    </div>
  );
}

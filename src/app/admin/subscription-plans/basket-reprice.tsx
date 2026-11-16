'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useRepriceBaskets, type BasketRepriceReport } from '@/hooks/use-admin';
import { formatMoney } from '@luvngift/shared';

// Every price is written one way, everywhere (formatMoney in @luvngift/shared).
const money = formatMoney;
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Moves existing baskets to today's catalogue cost and rate. Opens on a dry
 * run, so admin sees every change before anyone is emailed; confirming
 * schedules them (an increase after the Terms § 9 notice) and emails each one.
 */
export function RepriceBasketsDialog({ plan, onClose }: { plan: { id: string; name: string }; onClose: () => void }) {
  const preview = useRepriceBaskets();
  const run = useRepriceBaskets();

  useEffect(() => {
    preview.mutate({ planId: plan.id, dryRun: true });
    // Once, on open.
  }, [plan.id]);

  const report = run.data ?? preview.data;
  const busy = preview.isPending || run.isPending;

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !run.isPending) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reprice baskets: {plan.name}</DialogTitle>
          <DialogDescription>
            Each basket priced at today&apos;s catalogue cost and exchange rate, on the plan&apos;s current
            fees and platform share. An increase applies only after the notice period; a decrease from
            the next daily run. Every subscriber whose price changes is emailed.
          </DialogDescription>
        </DialogHeader>
        {!report ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <ReportBody report={report} />
        )}
        <div className="flex gap-2 pt-2">
          {report?.dryRun && report.changes.length > 0 && (
            <Button onClick={() => run.mutate({ planId: plan.id, dryRun: false })} disabled={busy}>
              {run.isPending ? <><Spinner size="sm" className="mr-2" />Scheduling…</> : `Schedule ${report.changes.length} change${report.changes.length === 1 ? '' : 's'} and email`}
            </Button>
          )}
          <Button variant={report && !report.dryRun ? 'default' : 'ghost'} onClick={onClose} disabled={run.isPending}>
            {report && !report.dryRun ? 'Done' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportBody({ report }: { report: BasketRepriceReport }) {
  return (
    <div className="space-y-3 text-sm">
      <p>
        {report.checked} basket{report.checked === 1 ? '' : 's'} checked: {report.changes.length} would change
        {report.dryRun ? '' : ' (scheduled)'}, {report.unchanged} unchanged
        {report.alreadyScheduled ? `, ${report.alreadyScheduled} already scheduled` : ''}.
      </p>
      {report.needsAttention.length > 0 && (
        <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {report.needsAttention.length} basket{report.needsAttention.length === 1 ? ' holds' : 's hold'} an
            item that is inactive or has no naira cost, so {report.needsAttention.length === 1 ? 'it was' : 'they were'} not
            repriced:{' '}
            {report.needsAttention.map((id, i) => (
              <span key={id}>{i ? ', ' : ''}<Link href={`/admin/subscriptions/${id}`} className="underline">{id.slice(-8).toUpperCase()}</Link></span>
            ))}
          </span>
        </p>
      )}
      {report.changes.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>{['Subscription', 'Now', 'New', 'From'].map((h) => <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {report.changes.map((c) => (
                <tr key={c.subscriptionId} className="border-t">
                  <td className="px-2 py-1.5">
                    <Link href={`/admin/subscriptions/${c.subscriptionId}`} className="underline">{c.subscriptionId.slice(-8).toUpperCase()}</Link>
                  </td>
                  <td className="px-2 py-1.5">{money(c.oldAmount, c.currency)}</td>
                  <td className={`px-2 py-1.5 font-medium ${c.newAmount > c.oldAmount ? 'text-red-700' : 'text-green-700'}`}>{money(c.newAmount, c.currency)}</td>
                  <td className="px-2 py-1.5">{day(c.effectiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { OPS_PROBLEM_KINDS, OPS_PROBLEM_LABELS, type OpsProblem } from '@luvngift/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useOpsQueue } from '@/hooks/use-ops';
import { since } from '@/components/ops/ops-ui';

/** What each kind of problem asks of the person reading it. */
const NEXT_STEP: Record<OpsProblem['kind'], string> = {
  AWAITING_PARTNER: 'Find a partner who covers this state, then flag the order to head office to assign them.',
  BOX_HELD: 'Head office is reviewing the box. Nothing to do unless they ask.',
  LINK_UNOPENED: 'Call the partner. If they did not get the link, resend it from the order.',
  DELIVERY_OVERDUE: 'Call the partner, then the recipient. Flag it if the gift is at risk.',
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function ProblemGroup({ kind, problems }: { kind: OpsProblem['kind']; problems: OpsProblem[] }) {
  if (problems.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="font-semibold">{OPS_PROBLEM_LABELS[kind]}</h2>
          <Badge variant="destructive">{problems.length}</Badge>
        </div>
        <p className="text-muted-foreground mb-3 text-sm">{NEXT_STEP[kind]}</p>
        <ul className="divide-y">
          {problems.map((p) => (
            <li key={`${p.kind}-${p.orderId}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <Link href={`/ops/orders/${p.orderId}`} className="font-medium underline underline-offset-2">
                  {p.reference}
                </Link>
                <span className="text-muted-foreground ml-2 text-sm">{p.destination}</span>
                {p.partner && <span className="text-muted-foreground ml-2 text-sm">· {p.partner.name}</span>}
                <p className="text-muted-foreground text-xs">{p.detail}</p>
              </div>
              <span className="text-muted-foreground text-xs">{since(p.since)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * The morning worklist: every paid order that needs someone to act, most
 * urgent first. Money has been taken on every order listed here.
 */
export default function OpsTodayPage() {
  const { data, isLoading, isError } = useOpsQueue();

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (isError || !data) return <p className="text-muted-foreground py-16 text-center">Could not load the queue.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-muted-foreground text-sm">
          Paid orders that need attention, most urgent first. Updated {since(data.generatedAt)}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Waiting for a partner" value={data.counts.awaitingPartner} />
        <Stat label="With a partner" value={data.counts.processing} />
        <Stat label="On their way" value={data.counts.shipped} />
        <Stat label="Delivered, last 7 days" value={data.counts.deliveredLast7Days} />
        <Link href="/ops/flags?status=OPEN" className="block">
          <Stat label="Open flags" value={data.openFlags} />
        </Link>
      </div>

      {data.problems.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p>Nothing needs attention right now.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            {data.problems.length} {data.problems.length === 1 ? 'thing needs' : 'things need'} attention.
          </p>
          {OPS_PROBLEM_KINDS.map((kind) => (
            <ProblemGroup key={kind} kind={kind} problems={data.problems.filter((p) => p.kind === kind)} />
          ))}
        </>
      )}
    </div>
  );
}

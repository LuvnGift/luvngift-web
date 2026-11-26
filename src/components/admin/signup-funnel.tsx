'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFunnel } from '@/hooks/use-marketing';
import { Button } from '@/components/ui/button';

const RANGES = [7, 30, 90] as const;

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * Where new customers stop. Each bar is a count of people who registered in
 * the range and reached that step, as a share of everyone who registered. The
 * biggest drop says where to look: before the billing address means the
 * signup asks too much; between the address and an order, the catalogue isn't
 * converting; between an order and payment, it's price or checkout.
 */
export function SignupFunnel() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, isLoading, isError } = useFunnel(days);

  const steps = data
    ? [
        { label: 'Registered', value: data.registered },
        { label: 'Verified their email', value: data.verifiedEmail },
        { label: 'Saved a billing address', value: data.savedBillingAddress },
        { label: 'Started an order', value: data.startedOrder },
        { label: 'Paid for an order', value: data.paidOrder },
      ]
    : [];

  // The step that loses the most people, so the eye goes there first.
  let worst = -1;
  let worstLoss = 0;
  steps.forEach((step, i) => {
    if (i === 0) return;
    const loss = steps[i - 1].value - step.value;
    if (loss > worstLoss) {
      worstLoss = loss;
      worst = i;
    }
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">New customer funnel</h3>
          <p className="text-xs text-muted-foreground">People who registered in the last {days} days</p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <Button key={r} size="sm" variant={r === days ? 'default' : 'outline'} onClick={() => setDays(r)}>
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded bg-muted" />
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">The funnel could not be loaded.</p>
      ) : data.registered === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody registered in this range.</p>
      ) : (
        <ol className="space-y-2.5">
          {steps.map((step, i) => {
            const share = pct(step.value, data.registered);
            const fromPrev = i === 0 ? null : pct(step.value, steps[i - 1].value);
            return (
              <li key={step.label} title={`${step.label}: ${step.value} (${share}% of registered)`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={i === worst ? 'font-medium' : undefined}>
                    {step.label}
                    {i === worst && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                        biggest drop
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{step.value}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {share}%{fromPrev !== null && ` · ${fromPrev}% of previous`}
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 w-full rounded bg-muted" aria-hidden>
                  <div className="h-2 rounded bg-primary" style={{ width: `${Math.max(share, step.value > 0 ? 1 : 0)}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {data && (
        <div className="border-t pt-3 text-sm">
          <p className="mb-1 font-medium">Weekly email (last 4 issues)</p>
          <p className="text-muted-foreground">
            {data.email.optedIn} opted in · {data.email.sent} sent · {data.email.clicked} clicked ·{' '}
            {data.email.paidAfterClick} paid within 7 days of a click.{' '}
            <Link href="/admin/marketing" className="underline underline-offset-2">
              Set this week’s email
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

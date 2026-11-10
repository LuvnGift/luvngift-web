'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Archive, RotateCcw, Trash2, Users, Calculator, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  useAdminPlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  usePlanPricingPreview,
  usePublishPlanPricing,
  type PlanInterval,
  type PlanPrice,
  type SubscriberCounts,
  type PricingPreview,
  type SubscriptionRules,
} from '@/hooks/use-admin';
import { FieldError } from '@/components/ui/field-error';
import {
  planFormSchema,
  planPricingFormSchema,
  toPricingInput,
  fieldErrors,
  stackFormValues,
  type PlanPricingFormValues,
} from '@/lib/admin-schemas';
import { CostStackInputs, SPLIT_HEADERS, SplitCells, StackSummary } from '@/components/admin/cost-stack';
import { PriceChangesSection } from './price-changes-section';
import { OFFERED_INTERVALS, cycleWord, cadenceLabel } from '@/lib/cadence';

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: 'US$', GBP: '£' };
const money = (cents: number, currency: string) =>
  `${cents < 0 ? '−' : ''}${SYMBOLS[currency] ?? currency}${(Math.abs(cents) / 100).toFixed(2)}`;
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;
const pct = (bps: number) => `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`;
const cadence = (i: PlanInterval) => cycleWord(i);

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  slotCount: number;
  sortOrder: number;
  isActive: boolean;
  boxAllowanceNgn: number | null;
  /** Legacy markup pricing; null once priced on the cost stack. */
  markupBps: number | null;
  /** The cost stack (kobo / basis points); null on a legacy plan. */
  agentFeeNgn?: number | null;
  deliveryFeeNgn?: number | null;
  platformBps?: number | null;
  intervals: PlanInterval[];
  pricedNgnPerUsd: number | null;
  pricedAt: string | null;
  prices: PlanPrice[];
  subscriberCounts: SubscriberCounts;
}

interface DetailsForm {
  name: string;
  description: string;
  slotCount: string | number;
  sortOrder: string | number;
  isActive: boolean;
}

const EMPTY_DETAILS: DetailsForm = { name: '', description: '', slotCount: 5, sortOrder: 0, isActive: true };
const EMPTY_PRICING: PlanPricingFormValues = {
  sourcingMajor: '',
  agentFeeMajor: '',
  deliveryFeeMajor: '',
  platformPercent: '',
  intervals: ['MONTHLY'],
};

const pricingOf = (plan: Plan): PlanPricingFormValues => ({
  ...stackFormValues({ goodsNgn: plan.boxAllowanceNgn, agentFeeNgn: plan.agentFeeNgn, deliveryFeeNgn: plan.deliveryFeeNgn, platformBps: plan.platformBps }),
  intervals: plan.intervals.length ? plan.intervals : ['MONTHLY'],
});

const isStack = (plan: Plan) => plan.boxAllowanceNgn !== null && plan.platformBps != null;

export default function AdminSubscriptionPlansPage() {
  const { data, isLoading } = useAdminPlans();
  const deletePlan = useDeletePlan();
  const updatePlan = useUpdatePlan();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [pricing, setPricing] = useState<Plan | null>(null);

  const plans: Plan[] = data?.data ?? [];
  const rules: SubscriptionRules | undefined = data?.rules;

  // Retiring closes a plan to new sign-ups; its subscribers keep billing and
  // stay visible here. Delete exists only for a retired plan nobody is on.
  const handleRetire = (plan: Plan) => {
    const live = liveCount(plan.subscriberCounts);
    const message = live
      ? `Retire "${plan.name}"? It closes to new sign-ups. Its ${live} subscriber${live === 1 ? '' : 's'} keep their box, price and deliveries.`
      : `Retire "${plan.name}"? It closes to new sign-ups.`;
    if (confirm(message)) updatePlan.mutate({ id: plan.id, isActive: false });
  };
  const handleReinstate = (plan: Plan) => {
    if (confirm(`Reopen "${plan.name}" to new sign-ups?`)) updatePlan.mutate({ id: plan.id, isActive: true });
  };
  const handleDelete = (plan: Plan) => {
    if (confirm(`Delete "${plan.name}"? It disappears from this page. This cannot be undone here.`)) {
      deletePlan.mutate(plan.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Subscription plans</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Set what one delivery&apos;s goods cost in naira, what the agent and delivery partner are
            paid, and the platform&apos;s share. The US$, CA$ and £ prices are worked out at
            today&apos;s exchange rate when you publish, and stay fixed until you publish again.
            Subscribers see one all-in price.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> New plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : plans.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No plans yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            The public subscriptions page stays empty until you create one.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              rules={rules}
              onEdit={() => setEditing(plan)}
              onPricing={() => setPricing(plan)}
              onRetire={() => handleRetire(plan)}
              onReinstate={() => handleReinstate(plan)}
              onDelete={() => handleDelete(plan)}
            />
          ))}
        </ul>
      )}

      {creating && <CreatePlanDialog onClose={() => setCreating(false)} />}
      {editing && <EditDetailsDialog plan={editing} onClose={() => setEditing(null)} />}
      {pricing && <PricingDialog plan={pricing} onClose={() => setPricing(null)} />}
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  rules,
  onEdit,
  onPricing,
  onRetire,
  onReinstate,
  onDelete,
}: {
  plan: Plan;
  rules?: SubscriptionRules;
  onEdit: () => void;
  onPricing: () => void;
  onRetire: () => void;
  onReinstate: () => void;
  onDelete: () => void;
}) {
  const priced = plan.boxAllowanceNgn !== null && (plan.markupBps !== null || plan.platformBps != null);
  const live = liveCount(plan.subscriberCounts);
  return (
    <li className={`rounded-lg border p-4 ${plan.isActive ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium flex items-center gap-2 flex-wrap">
            {plan.name}
            {!plan.isActive && <Badge tone="gray">Retired: closed to new sign-ups</Badge>}
            <Badge tone="blue">{plan.slotCount} slot{plan.slotCount === 1 ? '' : 's'}</Badge>
            {!priced && <Badge tone="red">Not priced: hidden from subscribers</Badge>}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
          {priced && (
            <p className="text-xs text-muted-foreground mt-2">
              Goods <strong className="text-foreground">{naira(plan.boxAllowanceNgn!)}</strong> per delivery
              {isStack(plan) ? (
                <> · agent {naira(plan.agentFeeNgn ?? 0)} · delivery {naira(plan.deliveryFeeNgn ?? 0)} · platform{' '}
                  <strong className="text-foreground">{pct(plan.platformBps!)}</strong></>
              ) : (
                <> · markup <strong className="text-foreground">{pct(plan.markupBps!)}</strong> (legacy: republish to use the cost stack)</>
              )}
              {plan.pricedNgnPerUsd && plan.pricedAt && (
                <> · published at ₦{plan.pricedNgnPerUsd.toLocaleString('en-NG')}/US$ on{' '}
                  {new Date(plan.pricedAt).toLocaleDateString()}</>
              )}
            </p>
          )}
          <SubscriberLine planId={plan.id} counts={plan.subscriberCounts} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-8" onClick={onPricing}>
            <Calculator className="h-3.5 w-3.5 mr-1" /> Pricing
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label={`Edit ${plan.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {plan.isActive ? (
            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={onRetire} aria-label={`Retire ${plan.name}`}>
              <Archive className="h-3.5 w-3.5 mr-1" /> Retire
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="h-8" onClick={onReinstate} aria-label={`Reinstate ${plan.name}`}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reinstate
              </Button>
              {live === 0 && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={onDelete} aria-label={`Delete ${plan.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {plan.prices.map((price) => (
          <PriceChip key={price.id} price={price} plan={plan} rules={rules} />
        ))}
      </div>
      <PriceChangesSection planId={plan.id} />
    </li>
  );
}

/**
 * A live price and what it earns at today's rate: the platform share for a
 * cost-stack plan (red once the FX buffer is used up), the markup for a legacy
 * one (red past the tolerance). The same rules as the daily alert.
 */
function PriceChip({ price, plan, rules }: { price: PlanPrice; plan: Plan; rules?: SubscriptionRules }) {
  const onSale = plan.intervals.includes(price.interval);
  if (isStack(plan)) return <StackPriceChip price={price} plan={plan} onSale={onSale} />;
  const slipped =
    price.liveMarkupBps !== null &&
    plan.markupBps !== null &&
    rules !== undefined &&
    price.liveMarkupBps < plan.markupBps - rules.marginTolerancePoints * 100;
  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${slipped ? 'border-red-300 bg-red-50' : ''}`}>
      {money(price.amount, price.currency)}{' '}
      <span className="text-muted-foreground font-normal">/ {cadence(price.interval)}</span>
      {!onSale && <span className="text-muted-foreground font-normal"> · existing subscribers only</span>}
      {price.liveMarkupBps !== null && (
        <span className={`ml-1.5 font-normal ${slipped ? 'text-red-700 font-semibold' : 'text-muted-foreground'}`}>
          · earning {pct(price.liveMarkupBps)} today{slipped ? ': republish' : ''}
        </span>
      )}
    </span>
  );
}

function StackPriceChip({ price, plan, onSale }: { price: PlanPrice; plan: Plan; onSale: boolean }) {
  const live = price.livePlatformBps ?? null;
  const slipped = live !== null && live < plan.platformBps!;
  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${slipped ? 'border-red-300 bg-red-50' : ''}`}>
      {money(price.amount, price.currency)}{' '}
      <span className="text-muted-foreground font-normal">/ {cadence(price.interval)}</span>
      {!onSale && <span className="text-muted-foreground font-normal"> · existing subscribers only</span>}
      {live !== null && (
        <span className={`ml-1.5 font-normal ${slipped ? 'text-red-700 font-semibold' : 'text-muted-foreground'}`}>
          · keeping {pct(live)} today{slipped ? ': republish' : ''}
        </span>
      )}
    </span>
  );
}

const liveCount = (c: SubscriberCounts) => c.ACTIVE + c.PAUSED + c.PAST_DUE;

/** Subscribers by status. Cancelled are shown apart: they are history, not customers. */
function SubscriberLine({ planId, counts }: { planId: string; counts: SubscriberCounts }) {
  const parts = [
    `${counts.ACTIVE} active`,
    counts.PAUSED ? `${counts.PAUSED} paused` : null,
    counts.PAST_DUE ? `${counts.PAST_DUE} past due` : null,
    counts.CANCELLED ? `${counts.CANCELLED} cancelled` : null,
  ].filter(Boolean);
  return (
    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
      <Users className="h-3 w-3" />
      <span className={counts.PAST_DUE ? 'text-amber-700' : ''}>{parts.join(' · ')}</span>
      {liveCount(counts) + counts.CANCELLED > 0 && (
        <Link href={`/admin/subscriptions?planId=${planId}`} className="text-primary hover:underline ml-1">
          View subscribers
        </Link>
      )}
    </p>
  );
}

function Badge({ tone, children }: { tone: 'gray' | 'blue' | 'red'; children: React.ReactNode }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function CreatePlanDialog({ onClose }: { onClose: () => void }) {
  const create = useCreatePlan();
  const [details, setDetails] = useState<DetailsForm>(EMPTY_DETAILS);
  const [pricing, setPricing] = useState<PlanPricingFormValues>(EMPTY_PRICING);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const preview = usePreviewState();

  const handleCreate = async () => {
    const d = planFormSchema.safeParse(details);
    const p = planPricingFormSchema.safeParse(pricing);
    if (!d.success || !p.success) {
      setErrors({ ...(d.success ? {} : fieldErrors(d.error)), ...(p.success ? {} : fieldErrors(p.error)) });
      return;
    }
    setErrors({});
    try {
      await create.mutateAsync({ ...d.data, ...toPricingInput(p.data) });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !create.isPending) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New subscription plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <DetailsFields value={details} onChange={setDetails} errors={errors} />
          <PricingFields value={pricing} onChange={setPricing} errors={errors} />
          <PreviewBlock pricing={pricing} state={preview} setErrors={setErrors} />
          <div className="flex gap-2 pt-1">
            <Button onClick={handleCreate} disabled={create.isPending || !preview.isFresh(pricing)}>
              {create.isPending ? <><Spinner size="sm" className="mr-2" />Creating…</> : 'Create plan'}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview the prices first. Creating the plan publishes them at the rate current at that
            moment and sets up the Stripe product and prices.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditDetailsDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const update = useUpdatePlan();
  const [details, setDetails] = useState<DetailsForm>({
    name: plan.name,
    description: plan.description,
    slotCount: plan.slotCount,
    sortOrder: plan.sortOrder,
    isActive: plan.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const d = planFormSchema.safeParse(details);
    if (!d.success) return setErrors(fieldErrors(d.error));
    try {
      await update.mutateAsync({ id: plan.id, ...d.data });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !update.isPending) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit plan</DialogTitle>
          <DialogDescription>Prices are changed from Pricing, not here.</DialogDescription>
        </DialogHeader>
        <DetailsFields value={details} onChange={setDetails} errors={errors} />
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <><Spinner size="sm" className="mr-2" />Saving…</> : 'Save changes'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PricingDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const publish = usePublishPlanPricing();
  const [pricing, setPricing] = useState<PlanPricingFormValues>(pricingOf(plan));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const preview = usePreviewState(plan.id);
  const increases = preview.data?.lines.some((l) => l.change === 'INCREASE');

  const handlePublish = async () => {
    const p = planPricingFormSchema.safeParse(pricing);
    if (!p.success) return setErrors(fieldErrors(p.error));
    try {
      await publish.mutateAsync({ planId: plan.id, ...toPricingInput(p.data) });
      onClose();
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !publish.isPending) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pricing: {plan.name}</DialogTitle>
          <DialogDescription>
            New subscribers pay a published price straight away. Existing subscribers are emailed
            and move to an increase only after the notice period; a decrease reaches them at the
            next daily run.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <PricingFields value={pricing} onChange={setPricing} errors={errors} />
          <PreviewBlock pricing={pricing} state={preview} setErrors={setErrors} />
          {increases && preview.isFresh(pricing) && (
            <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Publishing raises some prices. Every affected subscriber is emailed now.
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handlePublish} disabled={publish.isPending || !preview.isFresh(pricing)}>
              {publish.isPending ? <><Spinner size="sm" className="mr-2" />Publishing…</> : 'Publish pricing'}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={publish.isPending}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Fields ───────────────────────────────────────────────────────────────────

function DetailsFields({
  value,
  onChange,
  errors,
}: {
  value: DetailsForm;
  onChange: (v: DetailsForm) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" aria-invalid={!!errors.name} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Standard Grocery Box" />
        <FieldError message={errors.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} aria-invalid={!!errors.description} value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} />
        <FieldError message={errors.description} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="slotCount">Item slots</Label>
          {/* Raw string: a cleared input must fail by name, not save as 0. */}
          <Input id="slotCount" type="number" min={1} aria-invalid={!!errors.slotCount} value={value.slotCount} onChange={(e) => onChange({ ...value, slotCount: e.target.value })} />
          <FieldError message={errors.slotCount} />
          <p className="text-xs text-muted-foreground">The most different items a box may hold.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input id="sortOrder" type="number" min={0} aria-invalid={!!errors.sortOrder} value={value.sortOrder} onChange={(e) => onChange({ ...value, sortOrder: e.target.value })} />
          <FieldError message={errors.sortOrder} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={value.isActive} onChange={(e) => onChange({ ...value, isActive: e.target.checked })} className="h-4 w-4" />
        Active: shown on the public subscriptions page once priced
      </label>
    </div>
  );
}

function PricingFields({
  value,
  onChange,
  errors,
}: {
  value: PlanPricingFormValues;
  onChange: (v: PlanPricingFormValues) => void;
  errors: Record<string, string>;
}) {
  const toggleInterval = (i: PlanInterval) =>
    onChange({
      ...value,
      intervals: value.intervals.includes(i) ? value.intervals.filter((x) => x !== i) : [...value.intervals, i],
    });
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Pricing</p>
      <CostStackInputs
        value={value}
        onChange={onChange}
        errors={errors}
        goodsLabel="Box allowance (₦ per delivery)"
        goodsHint="What the box's groceries cost to buy. Subscribers fill it from the catalogue."
        idPrefix="plan"
      />
      <div className="flex gap-4 text-sm">
        {OFFERED_INTERVALS.map((i) => (
          <label key={i} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={value.intervals.includes(i)} onChange={() => toggleInterval(i)} className="h-4 w-4" />
            Sold {cadenceLabel(i)}
          </label>
        ))}
        {/* Retired: shown only so a plan still listing it can be unticked and saved. */}
        {value.intervals.includes('BIWEEKLY') && (
          <label className="flex items-center gap-2 cursor-pointer text-red-700">
            <input type="checkbox" checked onChange={() => toggleInterval('BIWEEKLY')} className="h-4 w-4" />
            Every 2 weeks (no longer sold: untick to save)
          </label>
        )}
      </div>
      <FieldError message={errors.intervals} />
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────

/**
 * The preview the publish button depends on. Publishing is only enabled while
 * the inputs still match what was previewed, so what admin saw is what goes
 * live (the API re-reads the rate at publish, which is the same feed).
 */
function usePreviewState(planId?: string) {
  const mutation = usePlanPricingPreview();
  const [previewedFor, setPreviewedFor] = useState<string | null>(null);
  const keyOf = (v: PlanPricingFormValues) => JSON.stringify(v);
  return {
    data: mutation.data,
    isPending: mutation.isPending,
    error: (mutation.error as { response?: { data?: { error?: { message?: string } } } } | null)
      ?.response?.data?.error?.message,
    isFresh: (v: PlanPricingFormValues) =>
      previewedFor === keyOf(v) && !!mutation.data && mutation.data.problems.length === 0,
    run: (v: PlanPricingFormValues) => {
      setPreviewedFor(keyOf(v));
      mutation.mutate({ planId, ...toPricingInput(v) });
    },
  };
}

function PreviewBlock({
  pricing,
  state,
  setErrors,
}: {
  pricing: PlanPricingFormValues;
  state: ReturnType<typeof usePreviewState>;
  setErrors: (e: Record<string, string>) => void;
}) {
  const handlePreview = () => {
    const p = planPricingFormSchema.safeParse(pricing);
    if (!p.success) return setErrors(fieldErrors(p.error));
    setErrors({});
    state.run(p.data);
  };
  const stale = state.data && state.data.problems.length === 0 && !state.isFresh(pricing);

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={handlePreview} disabled={state.isPending}>
        {state.isPending ? <Spinner size="sm" className="mr-2" /> : <Calculator className="h-4 w-4 mr-1.5" />}
        Preview prices
      </Button>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {stale && <p className="text-xs text-amber-700">The inputs changed since this preview. Preview again before publishing.</p>}
      {state.data && <PreviewTable preview={state.data} />}
    </div>
  );
}

function PreviewTable({ preview }: { preview: PricingPreview }) {
  const { rates } = preview;
  return (
    <div className="space-y-2 text-sm">
      <StackSummary quote={preview} />
      <p className="text-xs text-muted-foreground">
        Local prices use CA${rates.CAD} and £{rates.GBP} per US$. The goods line is the box allowance:
        each cycle&apos;s partner line is what that box actually costs.
      </p>
      {preview.problems.map((p) => (
        <p key={p} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">{p}</p>
      ))}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {['Price', 'Change', ...SPLIT_HEADERS].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.lines.map((l) => (
              <tr key={`${l.interval}-${l.currency}`} className="border-t">
                <td className="px-2 py-1.5 font-medium whitespace-nowrap">{money(l.amount, l.currency)} / {cadence(l.interval)}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {l.change === 'NEW'
                    ? 'New'
                    : l.change === 'SAME'
                      ? 'No change'
                      : `${l.change === 'INCREASE' ? 'Up' : 'Down'} from ${money(l.current!, l.currency)}`}
                </td>
                <SplitCells split={l.split} currency={l.currency} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Card fees are estimates from Settings → Subscription pricing. No sales tax is charged: the
        goods are delivered in Nigeria.
      </p>
    </div>
  );
}

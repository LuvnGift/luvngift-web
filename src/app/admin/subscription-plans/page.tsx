'use client';

import { useState } from 'react';
import { Plus, Pencil, Ban, Users, Calculator, AlertTriangle } from 'lucide-react';
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
  type PricingPreview,
  type SubscriptionRules,
} from '@/hooks/use-admin';
import { FieldError } from '@/components/ui/field-error';
import {
  planFormSchema,
  planPricingFormSchema,
  toPricingInput,
  fieldErrors,
  type PlanPricingFormValues,
} from '@/lib/admin-schemas';
import { PriceChangesSection } from './price-changes-section';

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: 'US$', GBP: '£' };
const money = (cents: number, currency: string) =>
  `${cents < 0 ? '−' : ''}${SYMBOLS[currency] ?? currency}${(Math.abs(cents) / 100).toFixed(2)}`;
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;
const pct = (bps: number) => `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`;
const cadence = (i: PlanInterval) => (i === 'MONTHLY' ? 'month' : '2 weeks');

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  slotCount: number;
  sortOrder: number;
  isActive: boolean;
  boxAllowanceNgn: number | null;
  markupBps: number | null;
  intervals: PlanInterval[];
  pricedNgnPerUsd: number | null;
  pricedAt: string | null;
  prices: PlanPrice[];
  _count?: { subscriptions: number };
}

interface DetailsForm {
  name: string;
  description: string;
  slotCount: string | number;
  sortOrder: string | number;
  isActive: boolean;
}

const EMPTY_DETAILS: DetailsForm = { name: '', description: '', slotCount: 5, sortOrder: 0, isActive: true };
const EMPTY_PRICING: PlanPricingFormValues = { sourcingMajor: '', markupPercent: '', intervals: ['MONTHLY'] };

const pricingOf = (plan: Plan): PlanPricingFormValues => ({
  sourcingMajor: plan.boxAllowanceNgn ? String(plan.boxAllowanceNgn / 100) : '',
  markupPercent: plan.markupBps !== null ? String(plan.markupBps / 100) : '',
  intervals: plan.intervals.length ? plan.intervals : ['MONTHLY'],
});

export default function AdminSubscriptionPlansPage() {
  const { data, isLoading } = useAdminPlans();
  const deletePlan = useDeletePlan();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [pricing, setPricing] = useState<Plan | null>(null);

  const plans: Plan[] = data?.data ?? [];
  const rules: SubscriptionRules | undefined = data?.rules;

  const handleDeactivate = (plan: Plan) => {
    const active = plan._count?.subscriptions ?? 0;
    const message =
      active > 0
        ? `${active} subscriber${active === 1 ? ' is' : 's are'} on "${plan.name}". Deactivating hides it from new signups; existing subscriptions keep billing. Continue?`
        : `Deactivate "${plan.name}"?`;
    if (confirm(message)) deletePlan.mutate(plan.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Subscription plans</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Set what one delivery costs to source in naira and your markup. The US$, CA$ and £
            prices are worked out at today&apos;s exchange rate when you publish, and stay fixed
            until you publish again.
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
              onDeactivate={() => handleDeactivate(plan)}
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
  onDeactivate,
}: {
  plan: Plan;
  rules?: SubscriptionRules;
  onEdit: () => void;
  onPricing: () => void;
  onDeactivate: () => void;
}) {
  const priced = plan.boxAllowanceNgn !== null && plan.markupBps !== null;
  return (
    <li className={`rounded-lg border p-4 ${plan.isActive ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium flex items-center gap-2 flex-wrap">
            {plan.name}
            {!plan.isActive && <Badge tone="gray">Inactive</Badge>}
            <Badge tone="blue">{plan.slotCount} slot{plan.slotCount === 1 ? '' : 's'}</Badge>
            {!priced && <Badge tone="red">Not priced: hidden from subscribers</Badge>}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
          {priced && (
            <p className="text-xs text-muted-foreground mt-2">
              Sourcing <strong className="text-foreground">{naira(plan.boxAllowanceNgn!)}</strong> per
              delivery · markup <strong className="text-foreground">{pct(plan.markupBps!)}</strong>
              {plan.pricedNgnPerUsd && plan.pricedAt && (
                <> · published at ₦{plan.pricedNgnPerUsd.toLocaleString('en-NG')}/US$ on{' '}
                  {new Date(plan.pricedAt).toLocaleDateString()}</>
              )}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Users className="h-3 w-3" />
            {plan._count?.subscriptions ?? 0} subscriber{(plan._count?.subscriptions ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-8" onClick={onPricing}>
            <Calculator className="h-3.5 w-3.5 mr-1" /> Pricing
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label={`Edit ${plan.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {plan.isActive && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={onDeactivate} aria-label={`Deactivate ${plan.name}`}>
              <Ban className="h-3.5 w-3.5" />
            </Button>
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
 * A live price and the markup it earns at today's rate. Red when the exchange
 * rate has moved it further below the plan's markup than the tolerance allows.
 */
function PriceChip({ price, plan, rules }: { price: PlanPrice; plan: Plan; rules?: SubscriptionRules }) {
  const onSale = plan.intervals.includes(price.interval);
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
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sourcing">Sourcing amount (₦ per delivery)</Label>
          <Input id="sourcing" type="number" min={0} step="1" placeholder="150000" aria-invalid={!!errors.sourcingMajor} value={value.sourcingMajor} onChange={(e) => onChange({ ...value, sourcingMajor: e.target.value })} />
          <FieldError message={errors.sourcingMajor} />
          <p className="text-xs text-muted-foreground">What the box&apos;s groceries cost to buy. Subscribers fill it from the catalogue.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="markup">Markup (%)</Label>
          <Input id="markup" inputMode="decimal" placeholder="60" aria-invalid={!!errors.markupPercent} value={value.markupPercent} onChange={(e) => onChange({ ...value, markupPercent: e.target.value })} />
          <FieldError message={errors.markupPercent} />
          <p className="text-xs text-muted-foreground">Added to the US$ cost. It pays the vendor&apos;s share and ours.</p>
        </div>
      </div>
      <div className="flex gap-4 text-sm">
        {(['MONTHLY', 'BIWEEKLY'] as const).map((i) => (
          <label key={i} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={value.intervals.includes(i)} onChange={() => toggleInterval(i)} className="h-4 w-4" />
            {i === 'MONTHLY' ? 'Sold monthly' : 'Sold every 2 weeks'}
          </label>
        ))}
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
      <p className="text-muted-foreground">
        Cost <strong className="text-foreground">{money(Math.round(preview.costUsdCents), 'USD')}</strong> at
        ₦{rates.NGN.toLocaleString('en-NG')}/US$ + {pct(preview.markupBps)} markup ={' '}
        <strong className="text-foreground">{money(preview.usdCents, 'USD')}</strong>. Local prices use
        CA${rates.CAD} and £{rates.GBP} per US$. The vendor receives their share of the price and buys
        the goods from it, so they break even at a {pct(preview.breakEvenMarkupBps)} markup. Card fees
        come out of Luvngift&apos;s share.
      </p>
      {preview.problems.map((p) => (
        <p key={p} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">{p}</p>
      ))}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {['Price', 'Change', 'Card fees', 'Vendor gets', 'Vendor keeps after goods', 'Luvngift gets'].map((h) => (
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
                <td className="px-2 py-1.5">{money(l.split.fees, l.currency)}</td>
                <td className="px-2 py-1.5">{money(l.split.vendor, l.currency)}</td>
                <td className={`px-2 py-1.5 ${l.vendorMargin < 0 ? 'text-red-700 font-semibold' : ''}`}>{money(l.vendorMargin, l.currency)}</td>
                <td className="px-2 py-1.5">{money(l.split.luvngift, l.currency)}</td>
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

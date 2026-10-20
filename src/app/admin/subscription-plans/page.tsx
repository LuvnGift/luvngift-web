'use client';

import { useState } from 'react';
import { Plus, Pencil, Ban, Users, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useAdminPlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  type PlanPriceInput,
  type BoxRules,
} from '@/hooks/use-admin';
import { FieldError } from '@/components/ui/field-error';
import { planFormSchema, planPricesSchema, fieldErrors } from '@/lib/admin-schemas';
import { PriceChangesSection } from './price-changes-section';

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£' };
const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString('en-NG')}`;
const CURRENCIES = ['CAD', 'USD', 'GBP'] as const;
const INTERVALS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
] as const;

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  slotCount: number;
  /** Kobo. Null = not configured, so the plan is hidden from subscribers. */
  boxAllowanceNgn: number | null;
  sortOrder: number;
  isActive: boolean;
  /** `goodsSharePercent`: the allowance as a share of this price at today's rate. */
  prices: (PlanPriceInput & { id: string; goodsSharePercent?: number | null })[];
  _count?: { subscriptions: number };
}

interface PlanFormState {
  name: string;
  description: string;
  slotCount: string | number;
  boxAllowanceMajor: string;
  sortOrder: string | number;
  isActive: boolean;
}

/** One editable price row in the create form. Amounts are entered in major units. */
interface PriceRow {
  interval: 'MONTHLY' | 'BIWEEKLY';
  currency: 'CAD' | 'USD' | 'GBP';
  amountMajor: string;
}

/**
 * The allowance as a share of one price at today's rate. It moves with the
 * naira, so a plan that was inside the cap when saved can drift over it.
 */
function GoodsShare({ value, max }: { value?: number | null; max?: number }) {
  if (value === undefined) return null;
  if (value === null) {
    return <span className="ml-1.5 text-muted-foreground font-normal">· goods share unknown</span>;
  }
  const over = max !== undefined && value > max;
  return (
    <span
      className={`ml-1.5 font-normal ${over ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}
      title={over ? `Above the ${max}% cap at today's rate: raise the price or lower the allowance` : undefined}
    >
      · goods {value}%{over ? ` (over ${max}%)` : ''}
    </span>
  );
}

export default function AdminSubscriptionPlansPage() {
  const { data, isLoading } = useAdminPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  // slotCount/sortOrder hold the raw input value, which is '' when the field is
  // cleared. Coercing on change would turn that into 0 and silently save a
  // zero-slot plan; the schema turns it into a named error instead.
  const [form, setForm] = useState<PlanFormState>({
    name: '',
    description: '',
    slotCount: 5,
    boxAllowanceMajor: '',
    sortOrder: 0,
    isActive: true,
  });
  const [prices, setPrices] = useState<PriceRow[]>([
    { interval: 'MONTHLY', currency: 'CAD', amountMajor: '' },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const plans: Plan[] = data?.data ?? [];
  const boxRules: BoxRules | undefined = data?.boxRules;

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      slotCount: 5,
      boxAllowanceMajor: '',
      sortOrder: 0,
      isActive: true,
    });
    setPrices([{ interval: 'MONTHLY', currency: 'CAD', amountMajor: '' }]);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      slotCount: plan.slotCount,
      boxAllowanceMajor: plan.boxAllowanceNgn ? String(plan.boxAllowanceNgn / 100) : '',
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
    });
    setErrors({});
    setOpen(true);
  };

  const handleSubmit = async () => {
    const body = planFormSchema.safeParse(form);

    // Prices are create-only — Stripe Prices are immutable, so editing omits them.
    const priceResult = editing ? null : planPricesSchema.safeParse(prices);

    if (!body.success || (priceResult && !priceResult.success)) {
      setErrors({
        ...(body.success ? {} : fieldErrors(body.error)),
        ...(priceResult && !priceResult.success ? fieldErrors(priceResult.error) : {}),
      });
      return;
    }
    setErrors({});

    const { boxAllowanceMajor, ...planBody } = body.data;
    const plan = { ...planBody, boxAllowanceNgn: Math.round(Number(boxAllowanceMajor) * 100) };
    try {
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, ...plan });
      } else {
        await createPlan.mutateAsync({
          ...plan,
          prices: priceResult!.data.map((p) => ({
            interval: p.interval,
            currency: p.currency,
            amount: Math.round(Number(p.amountMajor) * 100),
          })),
        });
      }
      setOpen(false);
    } catch {
      // surfaced by the hook
    }
  };

  const handleDeactivate = (plan: Plan) => {
    const active = plan._count?.subscriptions ?? 0;
    if (
      !confirm(
        active > 0
          ? `${active} subscriber${active === 1 ? ' is' : 's are'} on "${plan.name}". Deactivating hides it from new signups; existing subscriptions keep billing. Continue?`
          : `Deactivate "${plan.name}"?`,
      )
    )
      return;
    deletePlan.mutate(plan.id);
  };

  const saving = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Subscription plans</h1>
          <p className="text-muted-foreground text-sm">
            Tiers subscribers choose from. Each plan&apos;s box allowance sets what its box may
            cost to source; subscribers fill it from the catalogue.
          </p>
        </div>
        <Button onClick={openNew}>
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
          <Button onClick={openNew} className="mt-4">
            <Plus className="h-4 w-4 mr-1" /> Create the first plan
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className={`rounded-lg border p-4 ${plan.isActive ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2 flex-wrap">
                    {plan.name}
                    {!plan.isActive && (
                      <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-semibold">
                        Inactive
                      </span>
                    )}
                    <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                      {plan.slotCount} slot{plan.slotCount === 1 ? '' : 's'}
                    </span>
                    {plan.boxAllowanceNgn ? (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-semibold inline-flex items-center gap-1">
                        <Package className="h-3 w-3" /> Box {naira(plan.boxAllowanceNgn)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-semibold">
                        No box allowance: hidden from subscribers
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {plan._count?.subscriptions ?? 0} active subscriber
                    {(plan._count?.subscriptions ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(plan)} aria-label={`Edit ${plan.name}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {plan.isActive && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => handleDeactivate(plan)}
                      aria-label={`Deactivate ${plan.name}`}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {plan.prices.map((price) => (
                  <span
                    key={price.id}
                    className="rounded-md border px-2 py-1 text-xs font-medium"
                  >
                    {SYMBOLS[price.currency] ?? price.currency}
                    {(price.amount / 100).toFixed(2)}{' '}
                    <span className="text-muted-foreground font-normal">
                      {price.interval === 'MONTHLY' ? '/ month' : '/ 2 weeks'}
                    </span>
                    <GoodsShare value={price.goodsSharePercent} max={boxRules?.maxGoodsSharePercent} />
                  </span>
                ))}
              </div>
              <PriceChangesSection planId={plan.id} prices={plan.prices} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit plan' : 'New subscription plan'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                aria-invalid={!!errors.name}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Standard Grocery Box"
              />
              <FieldError message={errors.name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                aria-invalid={!!errors.description}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="A month of staples for one or two people — rice, oil, and fresh essentials."
              />
              <FieldError message={errors.description} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slotCount">Item slots</Label>
                <Input
                  id="slotCount"
                  type="number"
                  min={1}
                  aria-invalid={!!errors.slotCount}
                  value={form.slotCount}
                  // '' from a cleared input would become NaN via Number(); keep
                  // the raw string and let the schema reject it by name.
                  onChange={(e) => setForm({ ...form, slotCount: e.target.value })}
                />
                <FieldError message={errors.slotCount} />
                <p className="text-xs text-muted-foreground">
                  The most different items a box may hold. How much fits is set by the allowance.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sortOrder">Sort order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min={0}
                  aria-invalid={!!errors.sortOrder}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
                <FieldError message={errors.sortOrder} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="boxAllowance">Box allowance (₦ per delivery)</Label>
              <Input
                id="boxAllowance"
                type="number"
                min={0}
                step="1"
                placeholder="85000"
                aria-invalid={!!errors.boxAllowanceMajor}
                value={form.boxAllowanceMajor}
                onChange={(e) => setForm({ ...form, boxAllowanceMajor: e.target.value })}
              />
              <FieldError message={errors.boxAllowanceMajor} />
              <p className="text-xs text-muted-foreground">
                What one delivery&apos;s items may cost to source. Subscribers fill{' '}
                {boxRules?.minFillPercent ?? 80}–100% of it and only ever see percentages. It
                can&apos;t exceed {boxRules?.maxGoodsSharePercent ?? 50}% of any price on the plan
                at today&apos;s rate, which leaves the vendor&apos;s delivery and margin and our
                share. Set in Settings → Subscription boxes.
              </p>
            </div>

            {editing ? (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Prices can&apos;t be edited — Stripe Prices are immutable. To change what you
                  charge, create a new plan and deactivate this one. Existing subscribers keep
                  their current price.
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Prices</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setPrices([...prices, { interval: 'MONTHLY', currency: 'CAD', amountMajor: '' }])
                    }
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add price
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  One row per interval and currency. A subscriber can only choose a cadence you
                  priced in their currency.
                </p>
                <div className="space-y-2">
                  {prices.map((row, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex gap-2 items-center">
                      <select
                        className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={row.interval}
                        onChange={(e) => {
                          const next = [...prices];
                          next[i] = { ...row, interval: e.target.value as never };
                          setPrices(next);
                        }}
                      >
                        {INTERVALS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <select
                        className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={row.currency}
                        onChange={(e) => {
                          const next = [...prices];
                          next[i] = { ...row, currency: e.target.value as never };
                          setPrices(next);
                        }}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="49.99"
                        value={row.amountMajor}
                        onChange={(e) => {
                          const next = [...prices];
                          next[i] = { ...row, amountMajor: e.target.value };
                          setPrices(next);
                        }}
                        className="h-9"
                      />
                        {prices.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 shrink-0"
                            onClick={() => setPrices(prices.filter((_, idx) => idx !== i))}
                            aria-label="Remove this price"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                      {/* Keyed by array index, matching the schema's issue paths. */}
                      <FieldError message={errors[`${i}.amountMajor`] ?? errors[`${i}.currency`]} />
                    </div>
                  ))}
                </div>
                <FieldError message={errors['']} />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              Active — shown on the public subscriptions page
            </label>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <><Spinner size="sm" className="mr-2" />Saving…</>
                ) : editing ? (
                  'Save changes'
                ) : (
                  'Create plan'
                )}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
            {!editing && (
              <p className="text-xs text-muted-foreground">
                Creating a plan also creates the matching Stripe product and prices.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

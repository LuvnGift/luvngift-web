'use client';

import { useState } from 'react';
import { Plus, Pencil, Ban, Users, AlertTriangle } from 'lucide-react';
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
} from '@/hooks/use-admin';
import { toast } from 'sonner';

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£' };
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
  sortOrder: number;
  isActive: boolean;
  prices: (PlanPriceInput & { id: string })[];
  _count?: { subscriptions: number };
}

/** One editable price row in the create form. Amounts are entered in major units. */
interface PriceRow {
  interval: 'MONTHLY' | 'BIWEEKLY';
  currency: 'CAD' | 'USD' | 'GBP';
  amountMajor: string;
}

export default function AdminSubscriptionPlansPage() {
  const { data, isLoading } = useAdminPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    slotCount: 5,
    sortOrder: 0,
    isActive: true,
  });
  const [prices, setPrices] = useState<PriceRow[]>([
    { interval: 'MONTHLY', currency: 'CAD', amountMajor: '' },
  ]);

  const plans: Plan[] = data?.data ?? [];

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', slotCount: 5, sortOrder: 0, isActive: true });
    setPrices([{ interval: 'MONTHLY', currency: 'CAD', amountMajor: '' }]);
    setOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      slotCount: plan.slotCount,
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || form.description.trim().length < 10) {
      toast.error('Name and a description of at least 10 characters are required');
      return;
    }

    try {
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, ...form });
      } else {
        const parsed = prices.map((p) => ({
          interval: p.interval,
          currency: p.currency,
          amount: Math.round(Number(p.amountMajor) * 100),
        }));
        if (parsed.some((p) => !Number.isFinite(p.amount) || p.amount <= 0)) {
          toast.error('Every price needs an amount greater than zero');
          return;
        }
        const seen = new Set(parsed.map((p) => `${p.interval}-${p.currency}`));
        if (seen.size !== parsed.length) {
          toast.error('Each interval + currency combination can only appear once');
          return;
        }
        await createPlan.mutateAsync({ ...form, prices: parsed });
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
            Tiers subscribers choose from. Each plan sets how many catalogue items they can pick.
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
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {plan._count?.subscriptions ?? 0} active subscriber
                    {(plan._count?.subscriptions ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(plan)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {plan.isActive && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => handleDeactivate(plan)}
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
                  </span>
                ))}
              </div>
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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Standard Grocery Box"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="A month of staples for one or two people — rice, oil, and fresh essentials."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slotCount">Item slots</Label>
                <Input
                  id="slotCount"
                  type="number"
                  min={1}
                  value={form.slotCount}
                  onChange={(e) => setForm({ ...form, slotCount: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  How many catalogue items the subscriber may pick. Quantity doesn&apos;t consume
                  extra slots.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sortOrder">Sort order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </div>
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
                    <div key={i} className="flex gap-2 items-center">
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
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
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

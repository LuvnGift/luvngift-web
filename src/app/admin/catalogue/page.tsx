'use client';

import { useMemo, useState } from 'react';
import { Plus, Pencil, Ban, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';
import {
  useAdminCatalogueItems,
  useCreateCatalogueItem,
  useUpdateCatalogueItem,
  useDeleteCatalogueItem,
  type CatalogueItemInput,
} from '@/hooks/use-admin';
import { FieldError } from '@/components/ui/field-error';
import { catalogueItemFormSchema, fieldErrors } from '@/lib/admin-schemas';

interface CatalogueItem extends CatalogueItemInput {
  id: string;
  availableStates: string[];
  isActive: boolean;
}

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

/**
 * Items costed before box sizing may be in another currency. They are hidden
 * from the box picker until re-costed in naira.
 */
const isLegacy = (item: { currency?: string }) => (item.currency ?? 'NGN') !== 'NGN';

const EMPTY: CatalogueItemInput = {
  name: '',
  description: '',
  price: 0,
  currency: 'NGN',
  category: '',
  stock: 0,
  isActive: true,
  availableStates: [],
};

export default function AdminCataloguePage() {
  const { data, isLoading } = useAdminCatalogueItems();
  const createItem = useCreateCatalogueItem();
  const updateItem = useUpdateCatalogueItem();
  const deleteItem = useDeleteCatalogueItem();

  const [editing, setEditing] = useState<CatalogueItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CatalogueItemInput>(EMPTY);
  // Price is entered in major units; the API stores the smallest unit.
  const [priceMajor, setPriceMajor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items: CatalogueItem[] = data?.data ?? [];

  const grouped = useMemo(() => {
    const map: Record<string, CatalogueItem[]> = {};
    for (const item of items) (map[item.category] ??= []).push(item);
    return map;
  }, [items]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setPriceMajor('');
    setErrors({});
    setOpen(true);
  };

  const openEdit = (item: CatalogueItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      currency: item.currency ?? 'NGN',
      category: item.category,
      stock: item.stock ?? 0,
      isActive: item.isActive,
      availableStates: item.availableStates ?? [],
    });
    // A legacy cost is in another currency. Pre-filling it would let one click
    // save CA$12 as ₦12, so the field starts empty and must be entered in naira.
    setPriceMajor(isLegacy(item) ? '' : (item.price / 100).toString());
    setErrors({});
    setOpen(true);
  };

  const toggleState = (state: string) => {
    const current = form.availableStates ?? [];
    setForm({
      ...form,
      availableStates: current.includes(state)
        ? current.filter((s) => s !== state)
        : [...current, state],
    });
  };

  const handleSubmit = async () => {
    const parsed = catalogueItemFormSchema.safeParse({
      ...form,
      priceMajor,
      description: form.description || undefined,
      availableStates: form.availableStates ?? [],
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});

    const { priceMajor: major, ...rest } = parsed.data;
    const payload = { ...rest, price: Math.round(Number(major) * 100) };

    try {
      if (editing) await updateItem.mutateAsync({ id: editing.id, ...payload });
      else await createItem.mutateAsync(payload);
      setOpen(false);
    } catch {
      // surfaced by the hook
    }
  };

  const handleDeactivate = (item: CatalogueItem) => {
    if (
      !confirm(
        `Deactivate "${item.name}"? Subscribers can no longer pick it. Existing deliveries that include it are unaffected.`,
      )
    )
      return;
    deleteItem.mutate(item.id);
  };

  const saving = createItem.isPending || updateItem.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Subscription catalogue</h1>
          <p className="text-muted-foreground text-sm">
            The items subscribers choose from when building their box, with what each costs to
            source in naira. Subscribers never see the cost, only how much of their box an item
            uses. Leave states empty to offer an item nationwide.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Add item
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No catalogue items yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Subscribers can&apos;t build a box until you add some. Start with a few staples —
            rice, oil, tomatoes.
          </p>
          <Button onClick={openNew} className="mt-4">
            <Plus className="h-4 w-4 mr-1" /> Add the first item
          </Button>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <section key={category}>
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              {category}
            </h2>
            <ul className="space-y-2">
              {catItems.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                    item.isActive ? '' : 'opacity-60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {item.name}
                      {!item.isActive && (
                        <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-semibold">
                          Inactive
                        </span>
                      )}
                      {isLegacy(item) && (
                        <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-semibold">
                          Needs a naira cost: hidden from subscribers
                        </span>
                      )}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {(item.availableStates?.length ?? 0) === 0
                        ? 'Nationwide'
                        : `${item.availableStates.length} state${item.availableStates.length === 1 ? '' : 's'}: ${item.availableStates.slice(0, 4).join(', ')}${item.availableStates.length > 4 ? '…' : ''}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium">
                      {SYMBOLS[item.currency ?? 'NGN']}
                      {isLegacy(item)
                        ? (item.price / 100).toFixed(2)
                        : Math.round(item.price / 100).toLocaleString('en-NG')}
                    </span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {item.isActive && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => handleDeactivate(item)}
                        aria-label={`Deactivate ${item.name}`}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit item' : 'Add catalogue item'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  aria-invalid={!!errors.name}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Bag of rice (5kg)"
                />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  aria-invalid={!!errors.category}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Staples"
                />
                <FieldError message={errors.category} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="description"
                rows={2}
                aria-invalid={!!errors.description}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <FieldError message={errors.description} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">Sourcing cost (₦)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="1"
                  aria-invalid={!!errors.priceMajor}
                  value={priceMajor}
                  onChange={(e) => setPriceMajor(e.target.value)}
                  placeholder="8500"
                />
                <FieldError message={errors.priceMajor} />
                {editing && isLegacy(editing) ? (
                  <p className="text-xs text-red-700">
                    This was costed as {SYMBOLS[editing.currency!] ?? editing.currency}
                    {(editing.price / 100).toFixed(2)}. Enter what it costs in naira to bring it back
                    into the box picker.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    What one unit costs the vendor to buy. Keep it current: boxes are sized
                    against it.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  aria-invalid={!!errors.stock}
                  value={form.stock}
                  // A cleared number input reads '' — Number('') is 0, but NaN
                  // would render as an empty controlled input and get sent on.
                  onChange={(e) =>
                    setForm({ ...form, stock: e.target.value === '' ? 0 : Number(e.target.value) })
                  }
                />
                <FieldError message={errors.stock} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Available in</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm({ ...form, availableStates: [] })}
                  >
                    Nationwide
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm({ ...form, availableStates: [...NIGERIAN_STATES] })}
                  >
                    Select all
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {(form.availableStates?.length ?? 0) === 0
                  ? 'No states selected — this item is offered nationwide.'
                  : `${form.availableStates!.length} selected.`}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto rounded-md border p-2">
                {NIGERIAN_STATES.map((state) => (
                  <label key={state} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.availableStates?.includes(state) ?? false}
                      onChange={() => toggleState(state)}
                      className="h-3.5 w-3.5"
                    />
                    {state}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              Active — subscribers can pick this
            </label>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <><Spinner size="sm" className="mr-2" />Saving…</> : editing ? 'Save changes' : 'Add item'}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

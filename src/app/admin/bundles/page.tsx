'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAdminBundles,
  useCreateBundle,
  useUpdateBundle,
  useDeleteBundle,
  useAllOccasions,
} from '@/hooks/use-admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Bundle, Occasion } from '@luvngift/shared';

const bundleItemSchema = z.object({
  name: z.string().min(1, 'Item name required'),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Min 1'),
});

const bundleFormSchema = z.object({
  occasionId: z.string().min(1, 'Occasion is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.coerce.number().positive('Must be greater than 0'),
  estimatedDeliveryDays: z.coerce.number().int().min(1, 'Min 1 day'),
  images: z.array(z.object({ url: z.string().url('Must be a valid URL') })).min(1, 'At least one image required'),
  items: z.array(bundleItemSchema).min(1, 'At least one item required'),
});

type BundleFormValues = z.infer<typeof bundleFormSchema>;

const defaultValues: BundleFormValues = {
  occasionId: '',
  name: '',
  description: '',
  price: 0,
  estimatedDeliveryDays: 7,
  images: [{ url: '' }],
  items: [{ name: '', description: '', quantity: 1 }],
};

function BundleForm({
  form,
  occasions,
  onSubmit,
  isPending,
  submitLabel,
  onCancel,
}: {
  form: ReturnType<typeof useForm<BundleFormValues>>;
  occasions: Occasion[];
  onSubmit: (values: BundleFormValues) => void;
  isPending: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  const { fields: imageFields, append: appendImage, remove: removeImage } =
    useFieldArray({ control: form.control, name: 'images' });

  const { fields: itemFields, append: appendItem, remove: removeItem } =
    useFieldArray({ control: form.control, name: 'items' });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
      {/* Occasion */}
      <div className="space-y-2">
        <Label>Occasion</Label>
        <Select
          value={form.watch('occasionId')}
          onValueChange={(v) => form.setValue('occasionId', v, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select occasion..." />
          </SelectTrigger>
          <SelectContent>
            {occasions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.occasionId && (
          <p className="text-xs text-destructive">{form.formState.errors.occasionId.message}</p>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label>Name</Label>
        <Input {...form.register('name')} placeholder="e.g. Classic Birthday Box" />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...form.register('description')} rows={3} placeholder="Describe what's in this bundle..." />
        {form.formState.errors.description && (
          <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>

      {/* Price — always USD; frontend converts to buyer's local currency */}
      <div className="space-y-2">
        <Label>Price (USD)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          {...form.register('price')}
          placeholder="e.g. 49.99"
        />
        <p className="text-xs text-muted-foreground">Enter price in US dollars. Buyers see it converted to their local currency.</p>
        {form.formState.errors.price && (
          <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
        )}
      </div>

      {/* Estimated delivery */}
      <div className="space-y-2">
        <Label>Estimated Delivery (days)</Label>
        <Input
          type="number"
          min="1"
          {...form.register('estimatedDeliveryDays')}
          placeholder="7"
        />
        {form.formState.errors.estimatedDeliveryDays && (
          <p className="text-xs text-destructive">
            {form.formState.errors.estimatedDeliveryDays.message}
          </p>
        )}
      </div>

      {/* Images */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Images</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendImage({ url: '' })}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Image
          </Button>
        </div>
        {imageFields.map((field, idx) => (
          <div key={field.id} className="flex gap-2">
            <Input
              {...form.register(`images.${idx}.url`)}
              placeholder="https://..."
              className="flex-1"
            />
            {imageFields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeImage(idx)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {form.formState.errors.images && (
          <p className="text-xs text-destructive">
            {form.formState.errors.images.message ?? form.formState.errors.images[0]?.url?.message}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Bundle Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendItem({ name: '', description: '', quantity: 1 })}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </Button>
        </div>
        {itemFields.map((field, idx) => (
          <div key={field.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
              {itemFields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Input
                  {...form.register(`items.${idx}.name`)}
                  placeholder="Item name"
                />
                {form.formState.errors.items?.[idx]?.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.items[idx]?.name?.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  type="number"
                  min="1"
                  {...form.register(`items.${idx}.quantity`)}
                  placeholder="Qty"
                />
                {form.formState.errors.items?.[idx]?.quantity && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.items[idx]?.quantity?.message}
                  </p>
                )}
              </div>
            </div>
            <Input
              {...form.register(`items.${idx}.description`)}
              placeholder="Description (optional)"
            />
          </div>
        ))}
        {form.formState.errors.items && !Array.isArray(form.formState.errors.items) && (
          <p className="text-xs text-destructive">{(form.formState.errors.items as any).message}</p>
        )}
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function AdminBundlesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminBundles(page);
  const { data: occasions = [] } = useAllOccasions();
  const createBundle = useCreateBundle();
  const updateBundle = useUpdateBundle();
  const deleteBundle = useDeleteBundle();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bundle | null>(null);

  const createForm = useForm<BundleFormValues>({
    resolver: zodResolver(bundleFormSchema),
    defaultValues,
  });

  const editForm = useForm<BundleFormValues>({
    resolver: zodResolver(bundleFormSchema),
    defaultValues,
  });

  const handleCreate = (values: BundleFormValues) => {
    createBundle.mutate(
      {
        ...values,
        currency: 'USD',
        price: Math.round(values.price * 100),
        images: values.images.map((i) => i.url),
        items: values.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          description: item.description || undefined,
        })),
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          createForm.reset(defaultValues);
        },
      },
    );
  };

  const handleEdit = (bundle: Bundle) => {
    setEditTarget(bundle);
    editForm.reset({
      occasionId: bundle.occasionId,
      name: bundle.name,
      description: bundle.description,
      price: bundle.price / 100,
      estimatedDeliveryDays: bundle.estimatedDeliveryDays,
      images: bundle.images.map((url) => ({ url })),
      items: bundle.items.map((item) => ({
        name: item.name,
        description: item.description ?? '',
        quantity: item.quantity,
      })),
    });
  };

  const handleUpdate = (values: BundleFormValues) => {
    if (!editTarget) return;
    updateBundle.mutate(
      {
        id: editTarget.id,
        ...values,
        currency: 'USD',
        price: Math.round(values.price * 100),
        images: values.images.map((i) => i.url),
        items: values.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          description: item.description || undefined,
        })),
      },
      { onSuccess: () => setEditTarget(null) },
    );
  };

  const handleToggleActive = (bundle: Bundle) => {
    updateBundle.mutate({ id: bundle.id, isActive: !bundle.isActive });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this bundle? This cannot be undone.')) return;
    deleteBundle.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const bundles: Bundle[] = data?.data ?? [];
  const meta = data?.meta;

  const occasionMap = new Map((occasions as Occasion[]).map((o) => [o.id, o.name]));

  const currencySymbols: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£' };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bundles</h1>
          <p className="text-muted-foreground text-sm">
            Manage gift bundles available for purchase.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Bundle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Occasion</th>
                  <th className="px-4 py-3 text-left font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Items</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bundles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No bundles found.
                    </td>
                  </tr>
                ) : (
                  bundles.map((bundle) => (
                    <tr
                      key={bundle.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{bundle.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {occasionMap.get(bundle.occasionId) ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {currencySymbols[bundle.currency] ?? bundle.currency}
                        {(bundle.price / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {bundle.items?.length ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={bundle.isActive ? 'default' : 'secondary'}>
                          {bundle.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(bundle)}
                            disabled={updateBundle.isPending}
                          >
                            {bundle.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(bundle)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(bundle.id)}
                            disabled={deleteBundle.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages} ({meta.total} bundles)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) createForm.reset(defaultValues); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Bundle</DialogTitle>
          </DialogHeader>
          <BundleForm
            form={createForm}
            occasions={occasions as Occasion[]}
            onSubmit={handleCreate}
            isPending={createBundle.isPending}
            submitLabel="Create Bundle"
            onCancel={() => { setCreateOpen(false); createForm.reset(defaultValues); }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Bundle</DialogTitle>
          </DialogHeader>
          <BundleForm
            form={editForm}
            occasions={occasions as Occasion[]}
            onSubmit={handleUpdate}
            isPending={updateBundle.isPending}
            submitLabel="Save Changes"
            onCancel={() => setEditTarget(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

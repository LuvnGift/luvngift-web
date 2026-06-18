'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAdminRoadmap,
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
  useDeleteRoadmapItem,
  type RoadmapStatus,
} from '@/hooks/use-admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: string | null;
  status: RoadmapStatus;
  targetLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  _count?: { subscriptions: number };
}

const STATUSES: { value: RoadmapStatus; label: string }[] = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'LAUNCHED', label: 'Launched' },
];

const STATUS_VARIANT: Record<RoadmapStatus, 'default' | 'secondary' | 'outline'> = {
  IN_PROGRESS: 'default',
  PLANNED: 'outline',
  LAUNCHED: 'secondary',
};

const schema = z.object({
  title: z.string().min(2, 'Title is required').max(120),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.string().max(60).optional().or(z.literal('')),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'LAUNCHED']),
  targetLabel: z.string().max(40).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  title: '',
  description: '',
  category: '',
  status: 'PLANNED',
  targetLabel: '',
  sortOrder: 0,
};

function toPayload(v: FormValues) {
  return {
    title: v.title,
    description: v.description,
    category: v.category?.trim() || undefined,
    status: v.status,
    targetLabel: v.targetLabel?.trim() || undefined,
    sortOrder: v.sortOrder,
  };
}

export default function AdminRoadmapPage() {
  const { data, isLoading } = useAdminRoadmap();
  const createItem = useCreateRoadmapItem();
  const updateItem = useUpdateRoadmapItem();
  const deleteItem = useDeleteRoadmapItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);

  const createForm = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const editForm = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  const handleCreate = (values: FormValues) => {
    createItem.mutate(toPayload(values), {
      onSuccess: () => {
        setCreateOpen(false);
        createForm.reset(EMPTY);
      },
    });
  };

  const handleEdit = (item: RoadmapItem) => {
    setEditTarget(item);
    editForm.reset({
      title: item.title,
      description: item.description,
      category: item.category ?? '',
      status: item.status,
      targetLabel: item.targetLabel ?? '',
      sortOrder: item.sortOrder,
    });
  };

  const handleUpdate = (values: FormValues) => {
    if (!editTarget) return;
    updateItem.mutate({ id: editTarget.id, ...toPayload(values) }, { onSuccess: () => setEditTarget(null) });
  };

  const handleToggleActive = (item: RoadmapItem) => {
    updateItem.mutate({ id: item.id, title: item.title, description: item.description, status: item.status, isActive: !item.isActive });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this roadmap item? This cannot be undone.')) return;
    deleteItem.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const items: RoadmapItem[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roadmap</h1>
          <p className="text-muted-foreground text-sm">
            Manage the public roadmap (/roadmap) and see who&apos;s on each waitlist.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Waitlist</th>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Visible</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No roadmap items yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{item.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[item.status]}>
                          {STATUSES.find((s) => s.value === item.status)?.label ?? item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.category ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item._count?.subscriptions ?? 0}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.sortOrder}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.isActive ? 'default' : 'secondary'}>
                          {item.isActive ? 'Live' : 'Hidden'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleToggleActive(item)} disabled={updateItem.isPending}>
                            {item.isActive ? 'Hide' : 'Show'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(item.id)}
                            disabled={deleteItem.isPending}
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Roadmap Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 py-2">
            <RoadmapFields form={createForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createItem.isPending}>
                {createItem.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Roadmap Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4 py-2">
            <RoadmapFields form={editForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateItem.isPending}>
                {updateItem.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoadmapFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  const { register, setValue, watch, formState: { errors } } = form;
  const status = watch('status');

  return (
    <>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input {...register('title')} placeholder="e.g. Canada-to-Canada gifting" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...register('description')} rows={3} placeholder="What this is and who it's for." />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setValue('status', v as RoadmapStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Sort order</Label>
          <Input type="number" {...register('sortOrder')} />
          {errors.sortOrder && <p className="text-xs text-destructive">{errors.sortOrder.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Category (optional)</Label>
          <Input {...register('category')} placeholder="e.g. New corridors" />
        </div>
        <div className="space-y-2">
          <Label>Target label (optional)</Label>
          <Input {...register('targetLabel')} placeholder='e.g. "Coming soon"' />
          <p className="text-xs text-muted-foreground">Soft label only — avoid hard dates.</p>
        </div>
      </div>
    </>
  );
}

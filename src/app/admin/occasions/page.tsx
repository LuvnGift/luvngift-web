'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAdminOccasions,
  useCreateOccasion,
  useUpdateOccasion,
  useDeleteOccasion,
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
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Occasion } from '@luvngift/shared';

const occasionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type OccasionFormValues = z.infer<typeof occasionSchema>;

export default function AdminOccasionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminOccasions(page);
  const createOccasion = useCreateOccasion();
  const updateOccasion = useUpdateOccasion();
  const deleteOccasion = useDeleteOccasion();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Occasion | null>(null);

  const createForm = useForm<OccasionFormValues>({
    resolver: zodResolver(occasionSchema),
    defaultValues: { name: '', description: '', image: '' },
  });

  const editForm = useForm<OccasionFormValues>({
    resolver: zodResolver(occasionSchema),
  });

  const handleCreate = (values: OccasionFormValues) => {
    createOccasion.mutate(
      { ...values, image: values.image || undefined },
      {
        onSuccess: () => {
          setCreateOpen(false);
          createForm.reset();
        },
      },
    );
  };

  const handleEdit = (occasion: Occasion) => {
    setEditTarget(occasion);
    editForm.reset({
      name: occasion.name,
      description: occasion.description,
      image: occasion.image ?? '',
    });
  };

  const handleUpdate = (values: OccasionFormValues) => {
    if (!editTarget) return;
    updateOccasion.mutate(
      { id: editTarget.id, ...values, image: values.image || undefined },
      { onSuccess: () => setEditTarget(null) },
    );
  };

  const handleToggleActive = (occasion: Occasion) => {
    updateOccasion.mutate({ id: occasion.id, isActive: !occasion.isActive });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this occasion? This cannot be undone.')) return;
    deleteOccasion.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const occasions: Occasion[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Occasions</h1>
          <p className="text-muted-foreground text-sm">
            Manage the occasion categories that group gift bundles.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Occasion
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Slug</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {occasions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No occasions found.
                    </td>
                  </tr>
                ) : (
                  occasions.map((occasion) => (
                    <tr
                      key={occasion.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{occasion.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {occasion.slug}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={occasion.isActive ? 'default' : 'secondary'}>
                          {occasion.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(occasion.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(occasion)}
                            disabled={updateOccasion.isPending}
                          >
                            {occasion.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(occasion)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(occasion.id)}
                            disabled={deleteOccasion.isPending}
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
            Page {meta.page} of {meta.totalPages} ({meta.total} occasions)
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Occasion</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...createForm.register('name')} placeholder="e.g. Birthday" />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...createForm.register('description')}
                placeholder="Describe this occasion..."
                rows={3}
              />
              {createForm.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input {...createForm.register('image')} placeholder="https://..." />
              {createForm.formState.errors.image && (
                <p className="text-xs text-destructive">{createForm.formState.errors.image.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOccasion.isPending}>
                {createOccasion.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Occasion</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...editForm.register('description')} rows={3} />
              {editForm.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input {...editForm.register('image')} placeholder="https://..." />
              {editForm.formState.errors.image && (
                <p className="text-xs text-destructive">{editForm.formState.errors.image.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateOccasion.isPending}>
                {updateOccasion.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

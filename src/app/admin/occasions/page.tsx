'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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

// Local extension: the installed @luvngift/shared types may not yet include the
// SEO fields. These come back from the API on the occasion record.
type AdminOccasion = Occasion & {
  seoIntro?: string | null;
  highlights?: string[];
  faqs?: { question: string; answer: string }[] | null;
};

const occasionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  seoIntro: z.string().optional().or(z.literal('')),
  // One highlight per line; converted to/from a string[] at the boundary.
  highlights: z.string().optional().or(z.literal('')),
  faqs: z
    .array(
      z.object({
        question: z.string().optional().or(z.literal('')),
        answer: z.string().optional().or(z.literal('')),
      }),
    )
    .optional(),
});

type OccasionFormValues = z.infer<typeof occasionSchema>;

const EMPTY_FORM: OccasionFormValues = {
  name: '',
  description: '',
  image: '',
  seoIntro: '',
  highlights: '',
  faqs: [],
};

/** Convert form values into the API payload (highlights → array, drop empty FAQs). */
function toPayload(values: OccasionFormValues) {
  return {
    name: values.name,
    description: values.description,
    image: values.image || undefined,
    seoIntro: values.seoIntro?.trim() || undefined,
    highlights: values.highlights
      ? values.highlights.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined,
    faqs: (values.faqs ?? [])
      .map((f) => ({ question: (f.question ?? '').trim(), answer: (f.answer ?? '').trim() }))
      .filter((f) => f.question && f.answer),
  };
}

export default function AdminOccasionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminOccasions(page);
  const createOccasion = useCreateOccasion();
  const updateOccasion = useUpdateOccasion();
  const deleteOccasion = useDeleteOccasion();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminOccasion | null>(null);

  const createForm = useForm<OccasionFormValues>({
    resolver: zodResolver(occasionSchema),
    defaultValues: EMPTY_FORM,
  });
  const createFaqs = useFieldArray({ control: createForm.control, name: 'faqs' });

  const editForm = useForm<OccasionFormValues>({
    resolver: zodResolver(occasionSchema),
    defaultValues: EMPTY_FORM,
  });
  const editFaqs = useFieldArray({ control: editForm.control, name: 'faqs' });

  const handleCreate = (values: OccasionFormValues) => {
    createOccasion.mutate(toPayload(values), {
      onSuccess: () => {
        setCreateOpen(false);
        createForm.reset(EMPTY_FORM);
      },
    });
  };

  const handleEdit = (occasion: AdminOccasion) => {
    setEditTarget(occasion);
    editForm.reset({
      name: occasion.name,
      description: occasion.description,
      image: occasion.image ?? '',
      seoIntro: occasion.seoIntro ?? '',
      highlights: (occasion.highlights ?? []).join('\n'),
      faqs: occasion.faqs ?? [],
    });
  };

  const handleUpdate = (values: OccasionFormValues) => {
    if (!editTarget) return;
    updateOccasion.mutate(
      { id: editTarget.id, ...toPayload(values) },
      { onSuccess: () => setEditTarget(null) },
    );
  };

  const handleToggleActive = (occasion: AdminOccasion) => {
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

  const occasions: AdminOccasion[] = data?.data ?? [];
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
                  <th className="px-4 py-3 text-left font-medium">SEO</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {occasions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No occasions found.
                    </td>
                  </tr>
                ) : (
                  occasions.map((occasion) => {
                    const hasSeo =
                      !!occasion.seoIntro ||
                      (occasion.highlights?.length ?? 0) > 0 ||
                      (occasion.faqs?.length ?? 0) > 0;
                    return (
                      <tr
                        key={occasion.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">{occasion.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {occasion.slug}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={hasSeo ? 'default' : 'secondary'}>
                            {hasSeo ? 'Added' : 'Missing'}
                          </Badge>
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
                            <Button variant="outline" size="sm" onClick={() => handleEdit(occasion)}>
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
                    );
                  })
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Occasion</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 py-2">
            <OccasionFields form={createForm} faqs={createFaqs} />
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Occasion</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4 py-2">
            <OccasionFields form={editForm} faqs={editFaqs} />
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

// ─── Shared form fields (used by both Create and Edit dialogs) ──────────────────

function OccasionFields({
  form,
  faqs,
}: {
  form: ReturnType<typeof useForm<OccasionFormValues>>;
  faqs: ReturnType<typeof useFieldArray<OccasionFormValues, 'faqs'>>;
}) {
  const { register, formState: { errors } } = form;

  return (
    <>
      <div className="space-y-2">
        <Label>Name</Label>
        <Input {...register('name')} placeholder="e.g. Birthday" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...register('description')} placeholder="Short description..." rows={2} />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Image URL (optional)</Label>
        <Input {...register('image')} placeholder="https://..." />
        {errors.image && <p className="text-xs text-destructive">{errors.image.message}</p>}
      </div>

      <div className="rounded-lg border p-3 space-y-4">
        <p className="text-sm font-semibold">SEO content (public page)</p>

        <div className="space-y-2">
          <Label>Intro</Label>
          <Textarea
            {...register('seoIntro')}
            placeholder="Rich intro shown above the bundles. Separate paragraphs with a blank line."
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            Tip: 1–2 paragraphs targeting a search phrase (e.g. “send birthday gifts to Nigeria”).
          </p>
        </div>

        <div className="space-y-2">
          <Label>Highlights</Label>
          <Textarea
            {...register('highlights')}
            placeholder={'One highlight per line, e.g.\nFresh cakes and cupcakes\nFlower bouquets and balloons'}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">One per line.</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>FAQs</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => faqs.append({ question: '', answer: '' })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add FAQ
            </Button>
          </div>
          {faqs.fields.length === 0 && (
            <p className="text-xs text-muted-foreground">No FAQs yet. Add a few common questions.</p>
          )}
          {faqs.fields.map((field, idx) => (
            <div key={field.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Q{idx + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => faqs.remove(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Input {...register(`faqs.${idx}.question`)} placeholder="Question" />
              <Textarea {...register(`faqs.${idx}.answer`)} placeholder="Answer" rows={2} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

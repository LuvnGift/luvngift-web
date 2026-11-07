'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useAdminItemCategories,
  useCreateItemCategory,
  useUpdateItemCategory,
  useReorderItemCategories,
  useDeleteItemCategory,
  type ItemCategory,
  type ItemCategoryIcon,
} from '@/hooks/use-admin';
import { AISLE_ICONS, AISLE_ICON_LABELS } from '@/components/subscriptions/aisle-icons';

const ICON_KEYS = Object.keys(AISLE_ICONS) as ItemCategoryIcon[];

/**
 * Add, rename, reorder and delete catalogue categories. They are the aisles of
 * the subscriber's box picker, in this order. A category with items can only
 * be deleted by moving them to another one first, so no item loses its aisle.
 */
export function CategoryManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: categories = [], isLoading } = useAdminItemCategories();
  const create = useCreateItemCategory();
  const reorder = useReorderItemCategories();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<ItemCategoryIcon>('other');

  const add = async () => {
    if (name.trim().length < 2) return;
    try {
      await create.mutateAsync({ name: name.trim(), icon });
      setName('');
      setIcon('other');
    } catch {
      // surfaced by the hook
    }
  };

  const move = (index: number, delta: number) => {
    const ids = categories.map((c) => c.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id);
    reorder.mutate(ids);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catalogue categories</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Subscribers see these as the aisles of their box, in this order. Renaming one updates every item in it.
        </p>

        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label htmlFor="new-category">New category</Label>
            <Input
              id="new-category"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="Frozen food"
            />
          </div>
          <IconSelect value={icon} onChange={setIcon} />
          <Button onClick={add} disabled={create.isPending || name.trim().length < 2}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No categories yet. Add the first one above.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {categories.map((c, i) => (
              <CategoryRow
                key={c.id}
                category={c}
                others={categories.filter((o) => o.id !== c.id)}
                first={i === 0}
                last={i === categories.length - 1}
                busy={reorder.isPending}
                onUp={() => move(i, -1)}
                onDown={() => move(i, 1)}
              />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({
  category,
  others,
  first,
  last,
  busy,
  onUp,
  onDown,
}: {
  category: ItemCategory;
  others: ItemCategory[];
  first: boolean;
  last: boolean;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const update = useUpdateItemCategory();
  const remove = useDeleteItemCategory();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [deleting, setDeleting] = useState(false);
  const [moveToId, setMoveToId] = useState('');
  const count = category._count.items;

  const saveName = async () => {
    const next = name.trim();
    if (next.length < 2 || next === category.name) {
      setName(category.name);
      return setEditing(false);
    }
    try {
      await update.mutateAsync({ id: category.id, name: next });
      setEditing(false);
    } catch {
      // surfaced by the hook; keep editing so the name can be fixed
    }
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync({ id: category.id, moveToId: count > 0 ? moveToId : undefined });
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <li className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        {/* The icon is its own picker: click it to change. */}
        <IconSelect value={category.icon} onChange={(icon) => update.mutate({ id: category.id, icon })} compact />

        {editing ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              value={name}
              maxLength={60}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') {
                  setName(category.name);
                  setEditing(false);
                }
              }}
              className="h-8"
              aria-label={`New name for ${category.name}`}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveName} aria-label="Save name">
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{category.name}</p>
            <p className="text-xs text-muted-foreground">
              {count} item{count === 1 ? '' : 's'}
            </p>
          </div>
        )}

        {!editing && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)} aria-label={`Rename ${category.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onUp} disabled={first || busy} aria-label={`Move ${category.name} up`}>
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDown} disabled={last || busy} aria-label={`Move ${category.name} down`}>
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-red-600"
          onClick={() => setDeleting((d) => !d)}
          aria-label={`Delete ${category.name}`}
          aria-expanded={deleting}
        >
          {deleting ? <X className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {deleting && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm">
          {count === 0 ? (
            <span className="flex-1">Delete &ldquo;{category.name}&rdquo;? It has no items.</span>
          ) : others.length === 0 ? (
            <span className="flex-1">
              This is the only category, so its {count} item{count === 1 ? '' : 's'} have nowhere to go. Add another first.
            </span>
          ) : (
            <>
              <span>Move its {count} item{count === 1 ? '' : 's'} to</span>
              <Select value={moveToId} onValueChange={setMoveToId}>
                <SelectTrigger className="h-8 w-48 bg-background">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {others.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {(count === 0 || others.length > 0) && (
            <Button
              size="sm"
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending || (count > 0 && !moveToId)}
            >
              {remove.isPending ? <Spinner size="sm" /> : count > 0 ? 'Move and delete' : 'Delete'}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function IconSelect({
  value,
  onChange,
  compact = false,
}: {
  value: ItemCategoryIcon;
  onChange: (icon: ItemCategoryIcon) => void;
  compact?: boolean;
}) {
  const Current = AISLE_ICONS[value] ?? AISLE_ICONS.other;
  return (
    <div className={compact ? 'shrink-0' : 'space-y-1.5'}>
      {!compact && <Label>Icon</Label>}
      <Select value={value} onValueChange={(v) => onChange(v as ItemCategoryIcon)}>
        <SelectTrigger
          className={compact ? 'h-8 w-14 rounded-full' : 'w-44'}
          aria-label={`Icon: ${AISLE_ICON_LABELS[value] ?? 'Basket'}`}
        >
          {/* Compact: the trigger shows just the glyph; the list still names each one. */}
          {compact ? (
            <SelectValue>
              <Current className="h-4 w-4" />
            </SelectValue>
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          {ICON_KEYS.map((key) => {
            const Glyph = AISLE_ICONS[key];
            return (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <Glyph className="h-4 w-4" />
                  {AISLE_ICON_LABELS[key]}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

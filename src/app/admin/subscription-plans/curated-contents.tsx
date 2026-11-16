'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus, Search, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  useAllCatalogueItems,
  useSetPlanContents,
  type AdminCatalogueItem,
  type PlanContentLine,
  type PlanContentsResult,
} from '@/hooks/use-admin';

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;

/** Only active, naira-costed items can go in a box: the API refuses anything else. */
const boxable = (i: AdminCatalogueItem) => i.isActive && i.currency === 'NGN';

/** Catalogue cost of the lines, in kobo; null while any line is not boxable. */
export function contentsCost(lines: PlanContentLine[], catalogue: AdminCatalogueItem[]): number | null {
  const byId = new Map(catalogue.map((i) => [i.id, i]));
  let total = 0;
  for (const line of lines) {
    const item = byId.get(line.customItemId);
    if (!item || !boxable(item)) return null;
    total += item.price * line.quantity;
  }
  return total;
}

/**
 * Picks what a curated box holds. Admin sees each item's naira cost and the
 * running total: that total is the plan's goods line when it is priced.
 */
export function ContentsEditor({
  value,
  onChange,
  error,
}: {
  value: PlanContentLine[];
  onChange: (next: PlanContentLine[]) => void;
  error?: string;
}) {
  const { data: catalogue = [], isLoading } = useAllCatalogueItems();
  const [query, setQuery] = useState('');
  const byId = useMemo(() => new Map(catalogue.map((i) => [i.id, i])), [catalogue]);
  const chosen = new Set(value.map((l) => l.customItemId));
  const matches = catalogue
    .filter((i) => boxable(i) && !chosen.has(i.id))
    .filter((i) => `${i.name} ${i.category}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);
  const total = contentsCost(value, catalogue);

  const setQty = (id: string, quantity: number) =>
    onChange(
      quantity < 1
        ? value.filter((l) => l.customItemId !== id)
        : value.map((l) => (l.customItemId === id ? { ...l, quantity: Math.min(quantity, 50) } : l)),
    );

  if (isLoading) return <div className="flex justify-center py-6"><Spinner /></div>;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">What the box holds</p>
        <p className="text-sm">
          {total === null ? (
            <span className="text-red-700">An item is inactive or has no naira cost</span>
          ) : (
            <>Catalogue cost <strong>{naira(total)}</strong></>
          )}
        </p>
      </div>
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet. Search the catalogue below.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {value.map((line) => {
            const item = byId.get(line.customItemId);
            return (
              <li key={line.customItemId} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {item?.name ?? 'Unknown item'}
                  {item && !boxable(item) && <span className="ml-1 text-xs text-red-700">(inactive)</span>}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {item ? naira(item.price * line.quantity) : ''}
                </span>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`One fewer ${item?.name ?? ''}`} onClick={() => setQty(line.customItemId, line.quantity - 1)}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-6 text-center tabular-nums">{line.quantity}</span>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`One more ${item?.name ?? ''}`} onClick={() => setQty(line.customItemId, line.quantity + 1)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label={`Remove ${item?.name ?? ''}`} onClick={() => setQty(line.customItemId, 0)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Add from the catalogue…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the catalogue" />
      </div>
      {query.trim() && (
        <ul className="rounded-md border text-sm">
          {matches.length === 0 && <li className="px-2 py-1.5 text-muted-foreground">No matching active items.</li>}
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-2 py-1.5 text-left hover:bg-muted"
                onClick={() => {
                  onChange([...value, { customItemId: item.id, quantity: 1 }]);
                  setQuery('');
                }}
              >
                <span>{item.name} <span className="text-xs text-muted-foreground">· {item.category}</span></span>
                <span className="text-xs text-muted-foreground">{naira(item.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Subscribers get exactly this every delivery and cannot change it. Items limited to some
        states can only reach recipients there.
      </p>
    </div>
  );
}

/**
 * Changes a live curated plan's box. It applies to every subscriber at once
 * and emails each the reason, so the reason is required. The price is not
 * touched: republish from Pricing if the cost moved.
 */
export function ContentsDialog({
  plan,
  onClose,
}: {
  plan: { id: string; name: string; contents: { customItemId: string; quantity: number }[] };
  onClose: () => void;
}) {
  const save = useSetPlanContents();
  const [lines, setLines] = useState<PlanContentLine[]>(
    plan.contents.map((c) => ({ customItemId: c.customItemId, quantity: c.quantity })),
  );
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<PlanContentsResult | null>(null);
  const tooShort = reason.trim().length < 10;

  const handleSave = async () => {
    try {
      setResult(await save.mutateAsync({ planId: plan.id, contents: lines, reason: reason.trim() }));
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !save.isPending) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Box contents: {plan.name}</DialogTitle>
          <DialogDescription>
            Applies from each subscriber&apos;s next delivery, and every subscriber is emailed what
            changed and why. Prices stay as they are until you republish.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <ContentsResult result={result} onClose={onClose} />
        ) : (
          <div className="space-y-4">
            <ContentsEditor value={lines} onChange={setLines} />
            <div className="space-y-1.5">
              <Label htmlFor="contents-reason">Why is the box changing?</Label>
              <Textarea id="contents-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Garri replaces beans for the festive season" />
              <p className="text-xs text-muted-foreground">Sent to every subscriber on this plan.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={save.isPending || lines.length === 0 || tooShort}>
                {save.isPending ? <><Spinner size="sm" className="mr-2" />Saving…</> : 'Change the box'}
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContentsResult({ result, onClose }: { result: PlanContentsResult; onClose: () => void }) {
  return (
    <div className="space-y-3 text-sm">
      <p>
        Box changed for <strong>{result.applied}</strong> subscriber{result.applied === 1 ? '' : 's'}.
        It now costs <strong>{naira(result.contentsCostNgn)}</strong> in the catalogue.
      </p>
      {result.needsRepublish && (
        <Warning>
          The prices were built on {result.publishedGoodsNgn !== null ? naira(result.publishedGoodsNgn) : 'a different cost'}.
          Open Pricing and republish so the price matches the new box.
        </Warning>
      )}
      {result.overridden.length > 0 && (
        <Warning>
          {result.overridden.length} subscriber{result.overridden.length === 1 ? ' has' : 's have'} a box of
          their own (set from their subscription page) and kept it. Check each one still makes sense.
        </Warning>
      )}
      {result.undeliverableStates.length > 0 && (
        <Warning>
          Some items cannot be sourced in {result.undeliverableStates.join(', ')}, where subscribers on
          this plan live. Give those subscribers their own box, or change the item&apos;s states.
        </Warning>
      )}
      <Button onClick={onClose}>Done</Button>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

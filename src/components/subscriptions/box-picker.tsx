'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Minus, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { boxFill, type BoxFill } from '@/lib/box-fill';
import {
  aisleIcon,
  aisleSummary,
  searchItems,
  toAisles,
  SEARCH_FROM_ITEMS,
} from '@/lib/box-aisles';
import { AISLE_ICONS } from './aisle-icons';
import { pointsForFill } from '@/lib/points';

/** A catalogue item as the picker needs it. `share`: % of the box one unit fills. */
export interface PickerItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  /** The category's admin-chosen icon key; older API responses omit it. */
  categoryIcon?: string | null;
  share: number | null;
}

const MAX_QUANTITY = 20; // mirrors boxItemSchema in @luvngift/shared

/**
 * Choosing what goes in a subscription box: sign-up, a subscriber editing
 * their box, and an admin editing it for them all use this one picker, so the
 * rules a person sees are the same everywhere. The API is still the authority
 * (box-validation.ts); the meter only guides.
 *
 * Laid out as "aisles": one category open at a time, each closed aisle
 * summarising what was picked from it, and a tray of everything in the box
 * under the meter. A long catalogue never renders as one wall of cards.
 */
export function BoxPicker({
  items,
  picked,
  onChange,
  slotCount,
  minFill,
  whose = 'your',
  basket = false,
}: {
  items: PickerItem[];
  picked: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  slotCount: number;
  minFill: number;
  /** "your box" for the subscriber, "the box" for admin. */
  whose?: 'your' | 'the';
  /** A basket: a cart up to the plan's maximum, priced on what is in it, with no minimum. */
  basket?: boolean;
}) {
  const fill = boxFill(picked, items, minFill);
  const full = Object.keys(picked).length >= slotCount;
  const aisles = useMemo(() => toAisles(items), [items]);
  // An empty box opens the first aisle so there is somewhere to start; a box
  // that already has things in it starts closed, and the tray shows them.
  const [openAisle, setOpenAisle] = useState<string | null>(() =>
    Object.keys(picked).length === 0 ? (aisles[0]?.category ?? null) : null,
  );
  const [query, setQuery] = useState('');
  const results = useMemo(() => (query.trim() ? searchItems(items, query) : null), [items, query]);

  const toggle = (item: PickerItem) => {
    const next = { ...picked };
    if (next[item.id]) delete next[item.id];
    else if (!full) next[item.id] = 1;
    else return toast.error(`This plan allows ${slotCount} different items. Remove one first.`);
    onChange(next);
  };

  const setQty = (id: string, qty: number) => {
    if (qty < 1) {
      const next = { ...picked };
      delete next[id];
      return onChange(next);
    }
    onChange({ ...picked, [id]: Math.min(qty, MAX_QUANTITY) });
  };

  const showAisle = (category: string) => {
    setQuery('');
    setOpenAisle(category);
    requestAnimationFrame(() =>
      document.getElementById(aisleId(category))?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        We don&apos;t have items listed for this area yet, so we can&apos;t deliver a box here right now.
      </div>
    );
  }

  const cardProps = (item: PickerItem) => ({
    item,
    quantity: picked[item.id],
    whose,
    onToggle: () => toggle(item),
    onQuantity: (q: number) => setQty(item.id, q),
  });

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 space-y-2 rounded-lg border bg-background p-3">
        <BoxMeter fill={fill} minFill={minFill} whose={whose} basket={basket} bare />
        <BoxTray items={items} picked={picked} whose={whose} onShow={showAisle} onRemove={(id) => setQty(id, 0)} />
      </div>

      {items.length >= SEARCH_FROM_ITEMS && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items, e.g. rice"
            aria-label="Search items"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {results ? (
        results.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nothing matches &ldquo;{query}&rdquo;.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {results.map((item) => (
              <PickerCard key={item.id} {...cardProps(item)} showCategory />
            ))}
          </ul>
        )
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border">
          {aisles.map((aisle) => {
            const open = openAisle === aisle.category;
            const summary = aisleSummary(aisle.items, picked);
            const Icon = AISLE_ICONS[aisleIcon(aisle.category, aisle.items[0]?.categoryIcon)];
            const pickedNames = aisle.items.filter((i) => picked[i.id]).map((i) => i.name);
            const panelId = `${aisleId(aisle.category)}-panel`;
            return (
              <section key={aisle.category} id={aisleId(aisle.category)}>
                <button
                  type="button"
                  onClick={() => setOpenAisle(open ? null : aisle.category)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${open ? 'bg-muted/60' : 'hover:bg-muted/40'}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${summary.count ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{aisle.category}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {summary.count === 0
                        ? `${aisle.items.length} item${aisle.items.length === 1 ? '' : 's'}`
                        : open
                          ? `${summary.count} picked · fills ${summary.percent}%`
                          : `${pickedNames.join(', ')} · ${summary.percent}%`}
                    </span>
                  </span>
                  {summary.count > 0 && (
                    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
                      <span className="block h-full bg-primary" style={{ width: `${Math.min(summary.percent, 100)}%` }} />
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && (
                  <ul id={panelId} className="grid gap-2 bg-muted/20 p-3 sm:grid-cols-2">
                    {aisle.items.map((item) => (
                      <PickerCard key={item.id} {...cardProps(item)} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function aisleId(category: string) {
  return `aisle-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/** Everything in the box at a glance. A chip opens its aisle; × removes it. */
function BoxTray({
  items,
  picked,
  whose,
  onShow,
  onRemove,
}: {
  items: PickerItem[];
  picked: Record<string, number>;
  whose: 'your' | 'the';
  onShow: (category: string) => void;
  onRemove: (id: string) => void;
}) {
  const inBox = items.filter((i) => picked[i.id]);
  if (inBox.length === 0) {
    return <p className="text-xs text-muted-foreground">Open an aisle below to start filling {whose} box.</p>;
  }
  return (
    <ul className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto" aria-label={`In ${whose} box`}>
      {inBox.map((item) => (
        <li key={item.id} className="flex items-center rounded-full border bg-muted/50 text-xs">
          <button type="button" onClick={() => onShow(item.category)} className="py-1 pl-2.5 pr-1 hover:underline">
            {item.name}
            {picked[item.id] > 1 && <span className="ml-1 font-semibold">×{picked[item.id]}</span>}
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name}`}
            className="rounded-full p-1 pr-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function PickerCard({
  item,
  quantity,
  whose,
  onToggle,
  onQuantity,
  showCategory = false,
}: {
  item: PickerItem;
  quantity: number | undefined;
  whose: 'your' | 'the';
  onToggle: () => void;
  onQuantity: (q: number) => void;
  showCategory?: boolean;
}) {
  const chosen = Boolean(quantity);
  return (
    <li>
      <div
        className={`flex h-full items-start gap-3 rounded-lg border bg-background p-3 transition-colors ${chosen ? 'border-primary ring-1 ring-primary/30' : 'hover:border-foreground/30'}`}
      >
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left" aria-pressed={chosen}>
          <p className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${chosen ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`}
            >
              {chosen && <Check className="h-3 w-3" />}
            </span>
            {item.name}
          </p>
          {showCategory && <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{item.category}</p>}
          {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
          {item.share !== null && (
            <p className="mt-1 text-xs text-muted-foreground">Each one fills {item.share}% of {whose} box</p>
          )}
        </button>
        {chosen && (
          <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Quantity of ${item.name}`}>
            <button
              type="button"
              onClick={() => onQuantity((quantity ?? 1) - 1)}
              aria-label={quantity === 1 ? `Remove ${item.name}` : `One less ${item.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{quantity}</span>
            <button
              type="button"
              onClick={() => onQuantity((quantity ?? 0) + 1)}
              disabled={(quantity ?? 0) >= MAX_QUANTITY}
              aria-label={`One more ${item.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Box fill against the minimum and 100%. Says what to do next in words: colour
 * alone does not tell someone whether to add or remove.
 */
export function BoxMeter({
  fill,
  minFill,
  whose = 'your',
  bare = false,
  basket = false,
}: {
  fill: BoxFill;
  minFill: number;
  whose?: 'your' | 'the';
  basket?: boolean;
  /** Inside another container (the picker's sticky header): no border or stickiness of its own. */
  bare?: boolean;
}) {
  const Box = whose === 'your' ? 'Your box' : 'The box';
  const width = Math.min(fill.percent, 100);
  const tone = fill.status === 'OVER' ? 'bg-red-500' : fill.status === 'OK' ? 'bg-green-600' : 'bg-amber-500';
  const message = {
    EMPTY: `${Box} is empty. Add items until it is at least ${minFill}% full.`,
    UNDER: `${Box} is ${fill.percent}% full. Add a little more to reach ${minFill}%.`,
    // Only the subscriber earns, so admin sees no points hint.
    OK:
      whose === 'your' && pointsForFill(fill.percent) > 0
        ? `${Box} is ${fill.percent}% full. Ready to go, and it earns ${pointsForFill(fill.percent)} points each delivery.`
        : `${Box} is ${fill.percent}% full. Ready to go.`,
    OVER: `${Box} is ${fill.percent}% full. Remove or reduce something to bring it to 100%.`,
  }[fill.status];
  // A basket has no minimum and earns no points: the meter is only the ceiling.
  const basketMessage = {
    EMPTY: `${whose === 'your' ? 'Your' : 'The'} basket is empty. Add what they need.`,
    UNDER: '',
    OK: `${whose === 'your' ? 'Your' : 'The'} basket is ${fill.percent}% of the most one delivery can hold.`,
    OVER: `${whose === 'your' ? 'Your' : 'The'} basket is ${fill.percent}% of the most one delivery can hold. Remove or reduce something.`,
  }[fill.status];

  return (
    <div className={bare ? 'space-y-2' : 'sticky top-16 z-10 space-y-2 rounded-lg border bg-background p-3'}>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fill.percent}
        aria-label={`How full ${whose} box is`}
      >
        <div className={`h-full ${tone} transition-all`} style={{ width: `${width}%` }} />
        {/* The minimum: the bar must reach this line. A basket has none. */}
        {!basket && <div className="absolute inset-y-0 w-0.5 bg-foreground/50" style={{ left: `${minFill}%` }} />}
      </div>
      <p className={`text-sm ${fill.status === 'OVER' ? 'font-medium text-red-700' : 'text-muted-foreground'}`} aria-live="polite">
        {basket ? basketMessage : message}
      </p>
    </div>
  );
}

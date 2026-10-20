'use client';

import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { boxFill, type BoxFill } from '@/lib/box-fill';

/** A catalogue item as the picker needs it. `share`: % of the box one unit fills. */
export interface PickerItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  share: number | null;
}

const MAX_QUANTITY = 20; // mirrors boxItemSchema in @luvngift/shared

/**
 * Choosing what goes in a subscription box: sign-up, a subscriber editing
 * their box, and an admin editing it for them all use this one picker, so the
 * rules a person sees are the same everywhere. The API is still the authority
 * (box-validation.ts); the meter only guides.
 */
export function BoxPicker({
  items,
  picked,
  onChange,
  slotCount,
  minFill,
  whose = 'your',
}: {
  items: PickerItem[];
  picked: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  slotCount: number;
  minFill: number;
  /** "your box" for the subscriber, "the box" for admin. */
  whose?: 'your' | 'the';
}) {
  const fill = boxFill(picked, items, minFill);
  const full = Object.keys(picked).length >= slotCount;

  const grouped = useMemo(() => {
    const map: Record<string, PickerItem[]> = {};
    for (const item of items) (map[item.category] ??= []).push(item);
    return map;
  }, [items]);

  const toggle = (item: PickerItem) => {
    const next = { ...picked };
    if (next[item.id]) delete next[item.id];
    else if (!full) next[item.id] = 1;
    else return toast.error(`This plan allows ${slotCount} different items. Remove one first.`);
    onChange(next);
  };

  const setQty = (id: string, qty: number) => {
    if (!Number.isInteger(qty) || qty < 1) return;
    onChange({ ...picked, [id]: Math.min(qty, MAX_QUANTITY) });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        We don&apos;t have items listed for this area yet, so we can&apos;t deliver a box here right now.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BoxMeter fill={fill} minFill={minFill} whose={whose} />
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{category}</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {catItems.map((item) => (
              <PickerCard
                key={item.id}
                item={item}
                quantity={picked[item.id]}
                whose={whose}
                onToggle={() => toggle(item)}
                onQuantity={(q) => setQty(item.id, q)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PickerCard({
  item,
  quantity,
  whose,
  onToggle,
  onQuantity,
}: {
  item: PickerItem;
  quantity: number | undefined;
  whose: 'your' | 'the';
  onToggle: () => void;
  onQuantity: (q: number) => void;
}) {
  const chosen = Boolean(quantity);
  return (
    <li>
      <div className={`rounded-lg border p-3 transition-colors ${chosen ? 'border-foreground bg-muted' : 'hover:bg-muted/40'}`}>
        <button type="button" onClick={onToggle} className="w-full text-left" aria-pressed={chosen}>
          <p className="font-medium text-sm flex items-center gap-2">
            {chosen && <Check className="h-3.5 w-3.5 text-green-600" />}
            {item.name}
          </p>
          {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
          {item.share !== null && (
            <p className="text-xs text-muted-foreground mt-1">Each one fills {item.share}% of {whose} box</p>
          )}
        </button>
        {chosen && (
          <div className="flex items-center gap-2 mt-2">
            <Label htmlFor={`qty-${item.id}`} className="text-xs text-muted-foreground">Qty</Label>
            <Input
              id={`qty-${item.id}`}
              type="number"
              min={1}
              max={MAX_QUANTITY}
              value={quantity}
              onChange={(e) => onQuantity(Number(e.target.value))}
              className="h-7 w-16 text-xs"
            />
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
export function BoxMeter({ fill, minFill, whose = 'your' }: { fill: BoxFill; minFill: number; whose?: 'your' | 'the' }) {
  const Box = whose === 'your' ? 'Your box' : 'The box';
  const width = Math.min(fill.percent, 100);
  const tone = fill.status === 'OVER' ? 'bg-red-500' : fill.status === 'OK' ? 'bg-green-600' : 'bg-amber-500';
  const message = {
    EMPTY: `${Box} is empty. Add items until it is at least ${minFill}% full.`,
    UNDER: `${Box} is ${fill.percent}% full. Add a little more to reach ${minFill}%.`,
    OK: `${Box} is ${fill.percent}% full. Ready to go.`,
    OVER: `${Box} is ${fill.percent}% full. Remove or reduce something to bring it to 100%.`,
  }[fill.status];

  return (
    <div className="sticky top-16 z-10 rounded-lg border bg-background p-3 space-y-2">
      <div
        className="relative h-2.5 rounded-full bg-muted overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fill.percent}
        aria-label={`How full ${whose} box is`}
      >
        <div className={`h-full ${tone} transition-all`} style={{ width: `${width}%` }} />
        {/* The minimum: the bar must reach this line. */}
        <div className="absolute inset-y-0 w-0.5 bg-foreground/50" style={{ left: `${minFill}%` }} />
      </div>
      <p className={`text-sm ${fill.status === 'OVER' ? 'text-red-700 font-medium' : 'text-muted-foreground'}`} aria-live="polite">
        {message}
      </p>
    </div>
  );
}

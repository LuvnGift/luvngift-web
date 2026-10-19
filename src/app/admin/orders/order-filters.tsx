'use client';

import { useEffect, useState } from 'react';
import { ArrowDownUp, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ORDER_TABS, type OrderListParams, type OrderTab } from '@/lib/admin-order-tabs';

/**
 * Status tabs with counts, a search box and a sort toggle for the admin orders
 * list. Stateless apart from the search text being typed: the URL is the source
 * of truth (see `admin-order-tabs.ts`), so this only reports changes.
 *
 * When an order's status changes it moves tabs by itself — every status update
 * invalidates the list, which refetches the current tab and all the counts.
 */
export function OrderFilters({
  params,
  counts,
  onChange,
}: {
  params: OrderListParams;
  counts?: Partial<Record<OrderTab, number>>;
  onChange: (next: Partial<OrderListParams>) => void;
}) {
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Order status" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {ORDER_TABS.map(({ id, label }) => (
          <TabButton
            key={id}
            label={label}
            count={counts?.[id]}
            active={params.tab === id}
            urgent={id === 'needs-action'}
            onSelect={() => onChange({ tab: id, page: 1 })}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBox value={params.q} onSearch={(q) => onChange({ q, page: 1 })} />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => onChange({ sort: params.sort === 'newest' ? 'oldest' : 'newest', page: 1 })}
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          {params.sort === 'newest' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  urgent,
  onSelect,
}: {
  label: string;
  count?: number;
  active: boolean;
  urgent: boolean;
  onSelect: () => void;
}) {
  // "Needs action" is highlighted while it has anything in it, on any tab.
  const alert = urgent && !!count;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 text-xs tabular-nums',
            active ? 'bg-primary-foreground/20' : alert ? 'bg-red-100 text-red-700' : 'bg-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Searches 300ms after typing stops, so each keystroke is not a request. */
function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(value);

  // Follow the URL when it changes from outside (back button, tab reset).
  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (text.trim() === value) return;
    const timer = setTimeout(() => onSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, value, onSearch]);

  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search #order ref, customer email or name, recipient…"
        className="pl-8 pr-8"
        maxLength={100}
        aria-label="Search orders"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setText('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

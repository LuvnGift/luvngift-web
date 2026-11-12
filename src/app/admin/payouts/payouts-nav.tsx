'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/payouts', label: 'Owed' },
  { href: '/admin/payouts/batches', label: 'Batches' },
  { href: '/admin/payouts/adjustments', label: 'Adjustments' },
];

/** Tabs across the partner payouts pages. */
export function PayoutsNav() {
  const path = usePathname();
  const active = (href: string) => (href === '/admin/payouts' ? path === href : path.startsWith(href));
  return (
    <nav className="flex gap-1 border-b" aria-label="Partner payouts">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${active(t.href) ? 'border-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

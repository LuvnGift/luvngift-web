'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClipboardList, Flag, LayoutDashboard, LogOut, Map, Menu, ShieldAlert, Store, UserCog, X } from 'lucide-react';
import { StaffPermission, hasStaffPermission, type OpsMe } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLogout, useMe } from '@/hooks/use-auth';
import { useOpsMe } from '@/hooks/use-ops';
import { STAFF_PROFILE_PATH } from '@/lib/auth-redirect';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/ops', label: 'Today', icon: LayoutDashboard },
  { href: '/ops/orders', label: 'Orders', icon: ClipboardList },
  { href: '/ops/partners', label: 'Partners', icon: Store },
  { href: '/ops/coverage', label: 'Coverage', icon: Map },
  { href: '/ops/flags', label: 'Flags', icon: Flag },
];

/** True when this account may see the dashboard at all (OPS_VIEW). */
const canView = (me: OpsMe) =>
  hasStaffPermission({ role: me.role, staffPermissions: me.permissions }, StaffPermission.OPS_VIEW);

/**
 * Staff must turn on two-step login before the API answers anything but /me
 * (403 TWO_FACTOR_REQUIRED). Instead of a page of errors, every ops page but
 * the profile shows this until they do.
 */
function TwoFactorGate() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <ShieldAlert className="mb-2 h-6 w-6" />
      <h1 className="text-lg font-semibold">Turn on two-step login first</h1>
      <p className="mt-1 text-sm">
        The ops dashboard shows recipients&apos; names, addresses and phone numbers, so it only opens
        once your account is protected by more than a password.
      </p>
      <Button asChild className="mt-4">
        <Link href={STAFF_PROFILE_PATH}>Set it up now</Link>
      </Button>
    </div>
  );
}

function Gate({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const { data: me, isLoading, isError, refetch } = useOpsMe();
  // Turning 2FA on (on the profile page) updates the account; re-read access so the gate opens.
  const { data: user } = useMe();
  useEffect(() => {
    if (user?.twoFactorEnabled !== undefined) void refetch();
  }, [user?.twoFactorEnabled, refetch]);
  if (pathname.startsWith(STAFF_PROFILE_PATH)) return <>{children}</>;
  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (isError || !me) return <p className="text-muted-foreground py-16 text-center">Could not load your access. Try again.</p>;
  if (me.role === 'STAFF' && !me.twoFactorEnabled) return <TwoFactorGate />;
  if (!canView(me)) {
    return <p className="text-muted-foreground py-16 text-center">Your account has no access to this dashboard yet.</p>;
  }
  return <>{children}</>;
}

export default function OpsClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: me } = useOpsMe();
  const { mutate: logout } = useLogout();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === '/ops' ? pathname === '/ops' : pathname.startsWith(href));
  const linkClass = (href: string) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      isActive(href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/ops" className="flex items-center">
          <Image src="/images/luvngift.png" alt="Luvngift" width={48} height={48} className="object-contain" />
        </Link>
        <span className="text-muted-foreground text-sm font-semibold">{me?.title ?? 'Ops'}</span>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {NAV_ITEMS.map((item) => (
          // No prefetch, for the same reason as the admin sidebar (single-use refresh token).
          <Link key={item.href} href={item.href} prefetch={false} onClick={() => setOpen(false)} className={linkClass(item.href)}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        {me?.role === 'ADMIN' && (
          <Link href="/admin" prefetch={false} className={linkClass('/admin')}>
            <LayoutDashboard className="h-4 w-4" />
            Back to admin
          </Link>
        )}
      </nav>
      <div className="space-y-1 border-t p-4">
        <Link href={STAFF_PROFILE_PATH} onClick={() => setOpen(false)} className={linkClass(STAFF_PROFILE_PATH)}>
          <UserCog className="h-4 w-4" />
          My profile
        </Link>
        <Button variant="ghost" className="text-muted-foreground w-full justify-start gap-3" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="bg-muted/30 flex h-screen overflow-hidden">
      <aside className="bg-background hidden w-64 shrink-0 border-r md:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="bg-background relative h-full w-64 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="text-muted-foreground hover:text-foreground absolute right-3 top-5 p-1"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="bg-background flex h-14 items-center gap-4 border-b px-4 md:hidden">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">{me?.title ?? 'Ops'}</span>
        </header>
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Gate pathname={pathname}>{children}</Gate>
        </main>
      </div>
    </div>
  );
}

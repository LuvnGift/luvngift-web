'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  MessageSquare,
  Star,
  Megaphone,
  CalendarDays,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  Map,
  Briefcase,
  Repeat,
  ShoppingBasket,
  ShieldCheck,
  Wrench,
  CalendarClock,
  ClipboardList,
  Banknote,
  UserCog,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { ADMIN_PROFILE_PATH } from '@/lib/auth-redirect';
import { useAdminOrderActivity } from '@/hooks/use-order-live';
import { useAdminChatAlerts } from '@/hooks/use-admin-chat-live';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/occasions', label: 'Occasions', icon: CalendarDays },
  { href: '/admin/bundles', label: 'Bundles', icon: Package },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CalendarClock },
  { href: '/admin/fulfilment', label: 'Fulfilment', icon: ClipboardList },
  { href: '/admin/subscription-plans', label: 'Plans', icon: Repeat },
  { href: '/admin/catalogue', label: 'Catalogue', icon: ShoppingBasket },
  { href: '/admin/vendors', label: 'Partners', icon: Store },
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/chat', label: 'Support Chat', icon: MessageSquare },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/admin/careers', label: 'Careers', icon: Briefcase },
  { href: '/admin/roadmap', label: 'Roadmap', icon: Map },
  { href: '/admin/admin-access', label: 'Admin Access', icon: ShieldCheck },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // A customer reply on a custom order alerts ops on whichever admin page is open.
  const openOrder = useCallback(
    (orderId: string) => router.push(`/admin/orders?order=${orderId}`),
    [router],
  );
  useAdminOrderActivity(openOrder);
  const pathname = usePathname();
  // A customer's chat message alerts on every admin page but the chat itself.
  const openChat = useCallback(
    (sessionId: string) => router.push(`/admin/chat?session=${sessionId}`),
    [router],
  );
  useAdminChatAlerts(openChat, pathname.startsWith('/admin/chat'));
  const { mutate: logout } = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/admin" className="flex items-center">
          <Image src="/images/luvngift.png" alt="Luvngift" width={48} height={48} className="object-contain" />
        </Link>
        <span className="font-semibold text-sm text-muted-foreground">Admin</span>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            // No prefetch: 17 links prefetched at once is what raced the
            // single-use refresh token (see isPrefetchRequest). The pages are
            // client-rendered, so prefetching saved little.
            prefetch={false}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-1 border-t p-4">
        {/* Your own 2FA and password. Admins have no customer account page. */}
        <Link
          href={ADMIN_PROFILE_PATH}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive(ADMIN_PROFILE_PATH)
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <UserCog className="h-4 w-4" />
          My profile
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 h-full bg-background shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-5 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Admin</span>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

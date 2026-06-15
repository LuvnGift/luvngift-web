'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Gift, Package, User, LogOut, Menu, X, Home, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth.store';
import { useLogout, useMe } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

// `protected` links require auth. They are hidden from the nav while logged out,
// so Next.js never prefetches (and caches) a redirect-to-login for them — which
// is what bounced users back to /login after signing in. /custom is public
// (guests can build a gift; auth is enforced at submit).
const customerLinks = [
  { href: '/', label: 'Home', icon: Home, protected: false },
  { href: '/occasions', label: 'Occasions', icon: Gift, protected: false },
  { href: '/custom', label: 'Custom Gift', icon: Package, protected: false },
  { href: '/orders', label: 'My Orders', icon: Package, protected: true },
];

const adminLinks = [
  { href: '/', label: 'Home', icon: Home, protected: false },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, protected: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { mutate: logout, isPending } = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Validate session against the server on every mount.
  // If the cookie has expired, useMe will error → clearAuth() → user becomes null.
  useMe();

  useEffect(() => {
    setMounted(true);
  }, []);

  const showAuthed = mounted && isAuthenticated;
  const isAdmin = showAuthed && user?.role === 'ADMIN';
  // Hide protected links (e.g. My Orders) until we know the user is signed in.
  const navLinks = (isAdmin ? adminLinks : customerLinks).filter(
    (link) => !link.protected || showAuthed,
  );

  const initials = user
    ? (user.firstName?.charAt(0) ?? user.username?.charAt(0) ?? '').toUpperCase()
    : '?';

  const welcomeName = user?.firstName ?? user?.username ?? null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
		<header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				{/* Brand */}
				<Link href={isAdmin ? "/admin" : "/"} className="flex items-center gap-1">
					<Image src="/images/luvngift.png" alt="Luvngift" width={48} height={48} priority className="object-contain" />
					<span className="text-lg font-bold tracking-tight text-foreground leading-none">
						Luv<span className="text-primary">N</span>gift
					</span>
				</Link>

				{/* Desktop nav */}
				<nav className="hidden md:flex items-center gap-6">
					{navLinks.map((link) => (
						<Link key={link.href} href={link.href} prefetch={link.protected ? false : undefined} className={cn("text-sm font-medium transition-colors hover:text-primary", isActive(link.href) ? "text-primary" : "text-muted-foreground")}>
							{link.label}
						</Link>
					))}
				</nav>

				{/* Desktop user menu */}
				<div className="hidden md:flex items-center gap-3">
					{mounted && isAuthenticated ? (
						<>
							{welcomeName && (
								<span className="text-sm text-muted-foreground hidden lg:inline">
									Welcome, <span className="font-medium text-foreground">{welcomeName}</span>
								</span>
							)}
							{!isAdmin && (
								<Link href="/account">
									<Avatar className="h-8 w-8 cursor-pointer">
										<AvatarFallback className="text-xs">{initials}</AvatarFallback>
									</Avatar>
								</Link>
							)}
							<Button variant="ghost" size="sm" onClick={() => logout()} disabled={isPending} className="gap-1">
								<LogOut className="h-4 w-4" />
								Sign out
							</Button>
						</>
					) : (
						<>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/login">Sign in</Link>
							</Button>
							<Button size="sm" asChild>
								<Link href="/register">Get started</Link>
							</Button>
						</>
					)}
				</div>

				{/* Mobile hamburger */}
				<button className="md:hidden p-2" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
					{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</button>
			</div>

			{/* Mobile menu */}
			{mobileOpen && (
				<div className="md:hidden border-t bg-background px-4 pb-4">
					<nav className="flex flex-col gap-1 pt-3">
						{navLinks.map((link) => (
							<Link key={link.href} href={link.href} prefetch={link.protected ? false : undefined} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent", isActive(link.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
								<link.icon className="h-4 w-4" />
								{link.label}
							</Link>
						))}
					</nav>
					<Separator className="my-3" />
					{mounted && isAuthenticated ? (
						<div className="flex flex-col gap-2">
							{!isAdmin && (
								<Link href="/account" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
									<User className="h-4 w-4" />
									Account {user && `(${user.username})`}
								</Link>
							)}
							<button
								onClick={() => {
									logout();
									setMobileOpen(false);
								}}
								className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-accent text-left"
							>
								<LogOut className="h-4 w-4" />
								Sign out
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							<Button variant="outline" asChild onClick={() => setMobileOpen(false)}>
								<Link href="/login">Sign in</Link>
							</Button>
							<Button asChild onClick={() => setMobileOpen(false)}>
								<Link href="/register">Get started</Link>
							</Button>
						</div>
					)}
				</div>
			)}
		</header>
	);
}

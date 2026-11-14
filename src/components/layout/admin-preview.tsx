import Link from 'next/link';
import { Eye, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Admin accounts may browse the storefront to check how it looks, but cannot
 * order, subscribe, review or chat to support (the API refuses them with
 * 403 ADMIN_ACCOUNT). These say so where it matters instead of letting an
 * admin fill in a form that will be refused.
 */

/** Strip under the navbar on every storefront page while signed in as admin. */
export function AdminPreviewBanner() {
  return (
    <div className="border-b bg-amber-50 text-amber-900">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p className="flex items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          You&apos;re viewing the store as an admin. Ordering is turned off for admin accounts.
        </p>
        <Link href="/admin" className="font-medium underline underline-offset-2">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

/** Stands in for a checkout, custom-gift or subscription flow. */
export function AdminShoppingBlocked({ action }: { action: string }) {
  return (
    <div className="rounded-lg border p-6 text-center">
      <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
      <p className="font-medium">Admin accounts can&apos;t {action}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        To test this, sign in with a separate customer account.
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/admin">Back to dashboard</Link>
      </Button>
    </div>
  );
}

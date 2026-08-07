import Link from 'next/link';
import { Gift, Search, Repeat, LifeBuoy } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

/**
 * Rendered whenever a route calls `notFound()`, or a URL matches nothing.
 *
 * This page still returns HTTP **404** — that is deliberate and correct. A page
 * that looks "not found" but returns 200 is a *soft 404*: Search Console flags
 * it as an error and crawl budget gets wasted on pages that can never rank.
 *
 * The thing to avoid isn't 404s, it's 404s on things that actually exist — see
 * `lib/api-fetch.ts`, which keeps a failing API from masquerading as a deleted
 * product.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
        <div className="mb-6 rounded-2xl bg-muted p-5">
          <Gift className="h-10 w-10 text-muted-foreground" aria-hidden />
        </div>

        <p className="text-sm font-semibold tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-muted-foreground">
          It may have been moved, or the gift you&apos;re looking for is no longer available.
          Here&apos;s where most people go next.
        </p>

        <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
          <Link
            href="/occasions"
            className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/50"
          >
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">Browse occasions</span>
          </Link>
          <Link
            href="/subscriptions"
            className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/50"
          >
            <Repeat className="h-5 w-5 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">Monthly gifting</span>
          </Link>
          <Link
            href="/contact"
            className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/50"
          >
            <LifeBuoy className="h-5 w-5 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">Get help</span>
          </Link>
        </div>

        <Button asChild className="mt-8">
          <Link href="/">Back to home</Link>
        </Button>
      </main>
      <Footer />
    </>
  );
}

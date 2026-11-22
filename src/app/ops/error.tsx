'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OpsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">This page could not load. You are still signed in.</p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/ops">Back to today</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

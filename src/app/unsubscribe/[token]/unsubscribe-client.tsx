'use client';

import Link from 'next/link';
import { MailX, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useUnsubscribe, useUnsubscribeStatus } from '@/hooks/use-marketing';

/**
 * One button, no sign-in, no "are you sure" survey: CASL requires the
 * unsubscribe to be simple and to take effect at once.
 */
export function UnsubscribeClient({ token }: { token: string }) {
  const status = useUnsubscribeStatus(token);
  const unsubscribe = useUnsubscribe(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md text-center">
        {status.isLoading ? (
          <CardContent className="py-12">
            <Spinner />
          </CardContent>
        ) : status.isError ? (
          <>
            <CardHeader>
              <CardTitle>This link is not valid</CardTitle>
              <CardDescription>
                It may have been copied incompletely. You can also turn our emails off from your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/account">Go to my account</Link>
              </Button>
            </CardContent>
          </>
        ) : status.data?.optedIn ? (
          <>
            <CardHeader>
              <MailX className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
              <CardTitle>Stop our gift-idea emails?</CardTitle>
              <CardDescription>You will still get emails about your orders.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled={unsubscribe.isPending} onClick={() => unsubscribe.mutate()}>
                {unsubscribe.isPending ? 'Unsubscribing…' : 'Unsubscribe'}
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <MailCheck className="mx-auto h-8 w-8 text-green-600" aria-hidden />
              <CardTitle>You’re unsubscribed</CardTitle>
              <CardDescription>
                We won’t send you marketing emails. Changed your mind? You can subscribe again from your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/">Back to Luvngift</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}

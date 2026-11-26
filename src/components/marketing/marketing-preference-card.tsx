'use client';

import { Mail } from 'lucide-react';
import { MARKETING_CONSENT_TEXT } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useMarketingPreference, useSetMarketingPreference } from '@/hooks/use-marketing';

/** On /account: the customer's marketing email choice, changeable any time. */
export function MarketingPreferenceCard() {
  const { data, isLoading } = useMarketingPreference();
  const setPreference = useSetMarketingPreference();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <CardTitle>Gift ideas by email</CardTitle>
        </div>
        <CardDescription>{MARKETING_CONSENT_TEXT}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        {isLoading || !data ? (
          <Spinner />
        ) : (
          <>
            <p className="text-sm">
              {data.optedIn ? (
                <>
                  <span className="font-medium text-green-700">You’re subscribed.</span>{' '}
                  Order updates are sent either way.
                </>
              ) : (
                <>You’re not subscribed. Order updates are still sent.</>
              )}
            </p>
            <Button
              variant={data.optedIn ? 'outline' : 'default'}
              disabled={setPreference.isPending}
              onClick={() => setPreference.mutate({ optIn: !data.optedIn, source: 'account_web' })}
            >
              {data.optedIn ? 'Unsubscribe' : 'Subscribe'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { Mail, X } from 'lucide-react';
import { MARKETING_CONSENT_TEXT } from '@luvngift/shared';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import {
  useDismissMarketingPrompt,
  useMarketingPreference,
  useSetMarketingPreference,
} from '@/hooks/use-marketing';

/**
 * The one-time "would you like our emails?" question for signed-in customers
 * who have never answered it (everyone who registered before the box existed,
 * and Google sign-ups). Asked here and not by email: CASL forbids emailing
 * someone to ask for consent. Both answers are recorded, so it never returns.
 *
 * Customers only: team accounts are never marketed to.
 */
export function MarketingOptInPrompt({ className = '' }: { className?: string }) {
  const isCustomer = useAuthStore((s) => s.isAuthenticated && s.user?.role === 'CUSTOMER');
  const { data } = useMarketingPreference(isCustomer);
  const setPreference = useSetMarketingPreference();
  const dismiss = useDismissMarketingPrompt();

  if (!isCustomer || !data?.promptPending) return null;
  const busy = setPreference.isPending || dismiss.isPending;

  return (
    <div className={`rounded-lg border border-primary/20 bg-primary/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-medium">Want gift ideas in your inbox?</p>
            <p className="text-sm text-muted-foreground">{MARKETING_CONSENT_TEXT}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => setPreference.mutate({ optIn: true, source: 'prompt_web' })}
            >
              Yes, email me
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => dismiss.mutate()}>
              No thanks
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dismiss.mutate()}
          disabled={busy}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

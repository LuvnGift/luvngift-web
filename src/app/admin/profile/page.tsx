'use client';

import { useMe } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ChangePasswordCard } from '@/components/account/change-password-card';
import { TwoFactorCard } from '@/components/account/two-factor-card';

/**
 * The signed-in admin's own security settings. They used to be reachable only
 * through the customer account page, which showed billing, saved cards and
 * subscriptions to someone who cannot shop, outside the dashboard. The cards
 * are the same components /account uses.
 */
export default function AdminProfilePage() {
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  const name = [me.firstName, me.lastName].filter(Boolean).join(' ') || me.username;
  const hasPassword = (me as { hasPassword?: boolean }).hasPassword !== false;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="text-muted-foreground text-sm">Your sign-in and security settings.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div className="min-w-0">
            <p className="font-medium">{name}</p>
            <p className="text-muted-foreground truncate text-sm">@{me.username} · {me.email}</p>
          </div>
          <Badge>Admin</Badge>
        </CardContent>
      </Card>

      <TwoFactorCard
        enabled={Boolean(me.twoFactorEnabled)}
        description="Required to pay partners, change their bank details and send bank-details links."
      />

      {hasPassword ? (
        <ChangePasswordCard />
      ) : (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            You sign in with Google, so there is no password to change here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

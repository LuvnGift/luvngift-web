'use client';

import { STAFF_PERMISSION_LABELS } from '@luvngift/shared';
import { useMe } from '@/hooks/use-auth';
import { useOpsMe } from '@/hooks/use-ops';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ChangePasswordCard } from '@/components/account/change-password-card';
import { TwoFactorCard } from '@/components/account/two-factor-card';

/**
 * A staff member's own sign-in settings and what their account can do. The
 * same cards as /account and /admin/profile. Reachable before 2FA is on, since
 * this is where it is turned on.
 */
export default function OpsProfilePage() {
  const { data: me, isLoading } = useMe();
  const { data: access } = useOpsMe();

  if (isLoading || !me) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const name = [me.firstName, me.lastName].filter(Boolean).join(' ') || me.username;
  const hasPassword = (me as { hasPassword?: boolean }).hasPassword !== false;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="text-muted-foreground text-sm">Your sign-in, security and what your account can do.</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{name}</p>
              <p className="text-muted-foreground truncate text-sm">@{me.username} · {me.email}</p>
            </div>
            <Badge>{access?.title ?? (access?.role === 'ADMIN' ? 'Admin' : 'Staff')}</Badge>
          </div>
          {access?.role === 'STAFF' && (
            <ul className="text-muted-foreground list-disc pl-5 text-sm">
              {access.permissions.map((p) => <li key={p}>{STAFF_PERMISSION_LABELS[p]}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      <TwoFactorCard
        enabled={Boolean(me.twoFactorEnabled)}
        description="Required before the ops dashboard opens: it shows recipients' names, addresses and phone numbers."
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

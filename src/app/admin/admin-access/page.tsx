'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useAdmins,
  useLookupUserByEmail,
  useUpdateUserRole,
  useAuditLog,
  type AdminUser,
  type AuditEntry,
} from '@/hooks/use-admin';
import { useMe } from '@/hooks/use-auth';
import { ADMIN_PROFILE_PATH } from '@/lib/auth-redirect';
import { STAFF_PERMISSION_LABELS } from '@luvngift/shared';
import { StaffAccessForm, type StaffAccessValue } from './staff-access-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, ShieldMinus, Search, AlertTriangle, CheckCircle, XCircle, ShieldAlert, History } from 'lucide-react';

/**
 * Granting admin access lives on its own page, reached deliberately from the
 * sidebar, rather than as a button beside every customer in the user list.
 *
 * The flow is find-then-confirm: you type an exact email, see who it resolves
 * to, and only then grant. That ordering exists so the consequential step is
 * never one stray click away, and so you cannot promote the wrong person by
 * misreading a row in a long table.
 *
 * The same flow grants STAFF access (e.g. the Country Brand Manager): a title
 * and a set of permission switches for the ops dashboard, nothing in here.
 */
export default function AdminAccessPage() {
  const { data: admins, isLoading } = useAdmins();
  const { data: me } = useMe();
  const lookup = useLookupUserByEmail();
  const updateRole = useUpdateUserRole();
  const { data: audit } = useAuditLog(1, 25);

  const [email, setEmail] = useState('');
  const [found, setFound] = useState<AdminUser | null>(null);
  const [grantingStaff, setGrantingStaff] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setFound(null);
    setGrantingStaff(false);
    lookup.mutate(email.trim(), { onSuccess: setFound });
  }

  const reset = () => {
    setFound(null);
    setEmail('');
    setGrantingStaff(false);
  };

  function grantStaff(value: StaffAccessValue) {
    if (!found) return;
    updateRole.mutate({ id: found.id, role: 'STAFF', ...value }, { onSuccess: reset });
  }

  function editStaff(member: AdminUser, value: StaffAccessValue) {
    updateRole.mutate(
      { id: member.id, role: 'STAFF', ...value },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function grant() {
    if (!found) return;
    updateRole.mutate(
      { id: found.id, role: 'ADMIN' },
      { onSuccess: reset },
    );
  }

  function revoke(admin: AdminUser) {
    const kind = admin.role === 'STAFF' ? 'staff' : 'admin';
    const message =
      `Remove ${kind} access from "${admin.username}" (${admin.email})? ` +
      'They will become a normal customer, lose access straight away and be signed out.';
    if (!confirm(message)) return;
    updateRole.mutate({ id: admin.id, role: 'CUSTOMER' });
  }

  const alreadyAdmin = found?.role === 'ADMIN';
  const unverified = found ? !found.emailVerified : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin and staff access</h1>
        <p className="text-muted-foreground text-sm">
          Grant or remove team access. Admins can see every order, issue refunds, read customer
          data and change settings. Staff use the ops dashboard only, with the permissions you
          give them.
        </p>
      </div>

      {/* Warn-only for now: enforcing 2FA at requireAdmin would lock out every
          existing admin the moment it deployed. */}
      {me && !me.twoFactorEnabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex gap-2">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Your account has no two-factor authentication</p>
              <p className="text-sm">
                Admins can issue refunds and read every customer&apos;s details. Right now a
                password is the only thing protecting that.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href={ADMIN_PROFILE_PATH}>Set up 2FA</Link>
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-semibold">Grant access</h2>
            <p className="text-muted-foreground text-sm">
              Enter the exact email address of an existing account. They must have registered
              and verified their email first.
            </p>
          </div>

          <form onSubmit={search} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFound(null);
                }}
                placeholder="person@example.com"
                autoComplete="off"
              />
            </div>
            <Button type="submit" variant="outline" disabled={lookup.isPending || !email.trim()}>
              {lookup.isPending ? (
                <><Spinner size="sm" className="mr-2" />Looking up…</>
              ) : (
                <><Search className="mr-2 h-4 w-4" />Find account</>
              )}
            </Button>
          </form>

          {lookup.isError && (
            <p className="text-destructive text-sm">
              {(lookup.error as any)?.response?.data?.error?.message ??
                'Could not find that account.'}
            </p>
          )}

          {found && (
            <div className="rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{found.username}</p>
                  <p className="text-muted-foreground text-sm">{found.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={found.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {found.role}
                    </Badge>
                    {found.emailVerified ? (
                      <span className="flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle className="h-3 w-3" /> Email verified
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1 text-xs">
                        <XCircle className="h-3 w-3" /> Email not verified
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setGrantingStaff(true)}
                    disabled={updateRole.isPending || unverified || found.role !== 'CUSTOMER'}
                  >
                    Give staff access
                  </Button>
                  <Button onClick={grant} disabled={updateRole.isPending || alreadyAdmin || unverified}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {updateRole.isPending ? 'Granting…' : 'Grant admin access'}
                  </Button>
                </div>
              </div>

              {grantingStaff && (
                <div className="mt-4 border-t pt-4">
                  <StaffAccessForm
                    submitLabel="Give staff access"
                    pending={updateRole.isPending}
                    onSubmit={grantStaff}
                    onCancel={() => setGrantingStaff(false)}
                  />
                </div>
              )}
              {found.role === 'STAFF' && (
                <p className="text-muted-foreground mt-3 text-sm">
                  This account already has staff access. Change it under Current team below.
                </p>
              )}

              {alreadyAdmin && (
                <p className="text-muted-foreground mt-3 text-sm">
                  This account is already an admin.
                </p>
              )}
              {unverified && (
                <p className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  This person has not verified their email address. Until they do, the account
                  cannot be given admin or staff access — anyone could have signed up with an address
                  they do not control.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold">Current team</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Everyone with admin or staff access.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="divide-y">
              {(admins ?? []).map((admin) => (
                <div
                  key={admin.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {admin.username}
                      {me?.id === admin.id && (
                        <span className="text-muted-foreground ml-2 text-xs font-normal">(you)</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm">{admin.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant={admin.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {admin.role === 'STAFF' ? (admin.staffTitle ?? 'Staff') : 'Admin'}
                      </Badge>
                      {!admin.twoFactorEnabled && (
                        <span className="flex items-center gap-1 text-xs text-amber-700">
                          <ShieldAlert className="h-3 w-3" />
                          {admin.role === 'STAFF'
                            ? 'No 2FA: the ops dashboard stays locked until they turn it on'
                            : 'No 2FA'}
                        </span>
                      )}
                    </div>
                    {admin.role === 'STAFF' && (
                      <ul className="text-muted-foreground mt-2 list-disc pl-5 text-xs">
                        {(admin.staffPermissions ?? []).map((p) => (
                          <li key={p}>{STAFF_PERMISSION_LABELS[p]}</li>
                        ))}
                      </ul>
                    )}
                    {editingId === admin.id && (
                      <div className="mt-4 max-w-xl">
                        <StaffAccessForm
                          initial={{ title: admin.staffTitle ?? '', permissions: admin.staffPermissions ?? [] }}
                          submitLabel="Save access"
                          pending={updateRole.isPending}
                          onSubmit={(v) => editStaff(admin, v)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    )}
                  </div>
                  {me?.id === admin.id ? (
                    <span className="text-muted-foreground text-xs">
                      You cannot change your own access
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      {admin.role === 'STAFF' && editingId !== admin.id && (
                        <Button variant="outline" size="sm" onClick={() => setEditingId(admin.id)}>
                          Edit access
                        </Button>
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revoke(admin)}
                      disabled={updateRole.isPending}
                    >
                      <ShieldMinus className="mr-1 h-3 w-3" />
                      Remove access
                    </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Separator className="my-4" />
          <p className="text-muted-foreground text-xs">
            The last remaining admin cannot be removed, and you cannot change your own access —
            either would lock everyone out of this dashboard. Every change signs that person out.
          </p>
        </CardContent>
      </Card>

      {/* Audit trail */}
      <Card>
        <CardContent className="p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <History className="h-4 w-4" />
            Recent admin activity
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Role changes, refunds and account deactivations, newest first.
          </p>

          {(audit?.data ?? []).length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nothing recorded yet. Entries appear here as admins act.
            </p>
          ) : (
            <div className="divide-y">
              {(audit?.data ?? []).map((entry: AuditEntry) => (
                <div key={entry.id} className="py-3">
                  <p className="text-sm">{entry.summary}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {entry.actorEmail} · {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

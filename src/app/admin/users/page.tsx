'use client';

import { useState } from 'react';
import { useAdminUsers, useDeactivateUser, useUpdateUserRole } from '@/hooks/use-admin';
import { useMe } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, ChevronRight, UserX, CheckCircle, XCircle, ShieldPlus, ShieldMinus } from 'lucide-react';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminUsers(page);
  const deactivate = useDeactivateUser();
  const updateRole = useUpdateUserRole();
  const { data: me } = useMe();

  const handleDeactivate = (userId: string, username: string) => {
    if (!confirm(`Deactivate user "${username}"? This is a soft delete and can be reversed.`)) return;
    deactivate.mutate(userId);
  };

  const handleRoleChange = (user: { id: string; username: string; role: string }) => {
    const promoting = user.role !== 'ADMIN';
    const message = promoting
      ? `Make "${user.username}" an admin? They will get full access to this dashboard — orders, refunds, customer data and settings.`
      : `Remove admin access from "${user.username}"? They will become a normal customer.`;
    if (!confirm(message)) return;
    updateRole.mutate({ id: user.id, role: promoting ? 'ADMIN' : 'CUSTOMER' });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">View and manage platform users.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Username</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Verified</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{user.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.emailVerified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* You cannot act on your own account here: demoting
                            yourself is the quickest way to lock everyone out.
                            The API enforces this too. */}
                        {me?.id === user.id ? (
                          <span className="text-muted-foreground text-xs">This is you</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRoleChange(user)}
                              disabled={updateRole.isPending || (user.role !== 'ADMIN' && !user.emailVerified)}
                              title={
                                user.role !== 'ADMIN' && !user.emailVerified
                                  ? 'This user has not verified their email yet'
                                  : undefined
                              }
                            >
                              {user.role === 'ADMIN' ? (
                                <><ShieldMinus className="mr-1 h-3 w-3" />Remove admin</>
                              ) : (
                                <><ShieldPlus className="mr-1 h-3 w-3" />Make admin</>
                              )}
                            </Button>
                            {user.role !== 'ADMIN' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeactivate(user.id, user.username)}
                                disabled={deactivate.isPending}
                              >
                                <UserX className="h-3 w-3 mr-1" />
                                Deactivate
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages} ({meta.total} users)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

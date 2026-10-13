'use client';

import { useState } from 'react';
import { useAdminUsers, useDeactivateUser, useReactivateUser } from '@/hooks/use-admin';
import { useMe } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, ChevronRight, UserX, UserCheck, CheckCircle, XCircle, Search, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [includeDeactivated, setIncludeDeactivated] = useState(false);

  const { data, isLoading } = useAdminUsers(page, 20, { search, includeDeactivated });
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const { data: me } = useMe();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const handleDeactivate = (userId: string, username: string) => {
    if (!confirm(`Deactivate user "${username}"? This is a soft delete and can be reversed.`)) return;
    deactivate.mutate(userId);
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

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2 min-w-[240px]">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by username or email"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
            >
              Clear
            </Button>
          )}
        </form>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDeactivated}
            onChange={(e) => { setIncludeDeactivated(e.target.checked); setPage(1); }}
          />
          Show deactivated
        </label>
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
                  <th className="px-4 py-3 text-left font-medium">2FA</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{user.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                          {user.deletedAt && <Badge variant="outline">Deactivated</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.emailVerified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.twoFactorEnabled ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : user.role === 'ADMIN' ? (
                          <span
                            className="flex items-center gap-1 text-xs text-amber-700"
                            title="This admin can issue refunds and read customer data without a second factor"
                          >
                            <ShieldAlert className="h-4 w-4" /> Off
                          </span>
                        ) : (
                          <XCircle className="text-muted-foreground h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {me?.id === user.id ? (
                          <span className="text-muted-foreground text-xs">This is you</span>
                        ) : user.deletedAt ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reactivate.mutate(user.id)}
                            disabled={reactivate.isPending}
                          >
                            <UserCheck className="mr-1 h-3 w-3" />
                            Reactivate
                          </Button>
                        ) : user.role === 'ADMIN' ? (
                          <span className="text-muted-foreground text-xs">
                            Manage in Admin Access
                          </span>
                        ) : (
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

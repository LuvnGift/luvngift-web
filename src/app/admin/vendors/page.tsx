'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useVendors, useSetVendorActive, useSetVendorStatus } from '@/hooks/use-admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, ChevronRight, Plus, Search, ExternalLink } from 'lucide-react';
import VendorFormModal from './vendor-form-modal';
import type { Vendor } from '@luvngift/shared';

// The installed shared Vendor type may not yet include the application fields.
type AdminVendor = Vendor & {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  contactName?: string | null;
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  RETAIL: 'Retail',
  DELIVERY: 'Delivery',
  LOGISTICS: 'Logistics',
};

export default function AdminVendorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [view, setView] = useState<'all' | 'pending'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);

  const { data, isLoading } = useVendors(
    page,
    20,
    search,
    includeInactive,
    view === 'pending' ? 'PENDING' : undefined,
  );
  const setActive = useSetVendorActive();
  const setStatus = useSetVendorStatus();

  const vendors: AdminVendor[] = data?.vendors ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const switchView = (next: 'all' | 'pending') => {
    setView(next);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleEdit = (vendor: AdminVendor) => {
    setEditVendor(vendor);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditVendor(null);
  };

  const handleToggleActive = (vendor: AdminVendor) => {
    const action = vendor.isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${vendor.name}"?`)) return;
    setActive.mutate({ id: vendor.id, isActive: !vendor.isActive });
  };

  const handleApprove = (vendor: AdminVendor) => {
    if (!confirm(`Approve "${vendor.name}" as a vendor? They will be notified by email.`)) return;
    setStatus.mutate({ id: vendor.id, status: 'APPROVED' });
  };

  const handleReject = (vendor: AdminVendor) => {
    if (!confirm(`Reject the application from "${vendor.name}"? They will be notified by email.`)) return;
    setStatus.mutate({ id: vendor.id, status: 'REJECTED' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-muted-foreground text-sm">Manage Nigeria-based fulfillment partners.</p>
        </div>
        <Button onClick={() => { setEditVendor(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add vendor
        </Button>
      </div>

      {/* View tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => switchView('all')}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            view === 'all' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All vendors
        </button>
        <button
          onClick={() => switchView('pending')}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            view === 'pending' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending applications
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email or state..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        {view === 'all' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIncludeInactive((v) => !v); setPage(1); }}
          >
            {includeInactive ? 'Active only' : 'Show inactive'}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Contact</th>
                    <th className="px-4 py-3 text-left font-medium">State</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        {search ? `No vendors found for "${search}".` : 'No vendors yet. Add your first vendor.'}
                      </td>
                    </tr>
                  ) : (
                    vendors.map((vendor) => (
                      <tr key={vendor.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{vendor.name}</p>
                          {vendor.notes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{vendor.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-muted-foreground">{vendor.email}</p>
                          <p className="text-xs text-muted-foreground">{vendor.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{vendor.state}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {BUSINESS_TYPE_LABELS[vendor.businessType] ?? vendor.businessType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {vendor.status === 'PENDING' ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-700">Pending review</Badge>
                          ) : vendor.status === 'REJECTED' ? (
                            <Badge variant="secondary">Rejected</Badge>
                          ) : (
                            <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                              {vendor.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {vendor.status === 'PENDING' ? (
                              <>
                                <Link href={`/admin/vendors/${vendor.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                <Button size="sm" onClick={() => handleApprove(vendor)} disabled={setStatus.isPending}>
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleReject(vendor)}
                                  disabled={setStatus.isPending}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <Link href={`/admin/vendors/${vendor.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                <Button variant="outline" size="sm" onClick={() => handleEdit(vendor)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={vendor.isActive ? 'text-destructive hover:text-destructive' : ''}
                                  onClick={() => handleToggleActive(vendor)}
                                  disabled={setActive.isPending}
                                >
                                  {vendor.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} vendors)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <VendorFormModal open={modalOpen} onClose={handleCloseModal} vendor={editVendor} />
    </div>
  );
}

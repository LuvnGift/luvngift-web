'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useVendor, useVendorOrders, useSetVendorActive } from '@/hooks/use-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, ChevronRight, ArrowLeft, Mail, Phone, MapPin, FileText, Pencil, User } from 'lucide-react';
import VendorFormModal from '../vendor-form-modal';
import type { Vendor } from '@luvngift/shared';

type AdminVendor = Vendor & { contactName?: string | null; status?: 'PENDING' | 'APPROVED' | 'REJECTED' };

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  RETAIL: 'Retail',
  DELIVERY: 'Delivery',
  LOGISTICS: 'Logistics',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DELIVERED: 'default',
  SHIPPED: 'default',
  PROCESSING: 'secondary',
  PENDING: 'outline',
  CANCELLED: 'destructive',
  REFUNDED: 'destructive',
};

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ordersPage, setOrdersPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: vendor, isLoading: vendorLoading } = useVendor(id) as { data: AdminVendor | undefined; isLoading: boolean };
  const { data: ordersData, isLoading: ordersLoading } = useVendorOrders(id, ordersPage);
  const setActive = useSetVendorActive();

  if (vendorLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Vendor not found.{' '}
        <Link href="/admin/vendors" className="underline">Back to vendors</Link>
      </div>
    );
  }

  const orders = ordersData?.orders ?? [];
  const ordersTotal: number = ordersData?.total ?? 0;
  const totalOrderPages = Math.ceil(ordersTotal / 10);

  const handleToggleActive = () => {
    const action = vendor.isActive ? 'Deactivate' : 'Activate';
    if (!confirm(`${action} "${vendor.name}"?`)) return;
    setActive.mutate({ id: vendor.id, isActive: !vendor.isActive });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/vendors">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Vendors
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{vendor.name}</h1>
              {vendor.status === 'PENDING' && (
                <Badge variant="outline" className="border-amber-300 text-amber-700">Pending review</Badge>
              )}
              {vendor.status === 'REJECTED' && (
                <Badge variant="secondary">Rejected</Badge>
              )}
              {(!vendor.status || vendor.status === 'APPROVED') && (
                <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                  {vendor.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {BUSINESS_TYPE_LABELS[vendor.businessType]} · Added {new Date(vendor.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={vendor.isActive ? 'text-destructive hover:text-destructive' : ''}
            onClick={handleToggleActive}
            disabled={setActive.isPending}
          >
            {vendor.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {vendor.contactName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span>{vendor.contactName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="break-all">{vendor.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{vendor.phone}</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{vendor.address}, {vendor.state}</span>
            </div>
            {vendor.notes && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{vendor.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Order summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{ordersTotal}</p>
            <p className="text-muted-foreground text-sm">Total orders assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Assigned orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ordersLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Order ID</th>
                    <th className="px-4 py-3 text-left font-medium">Recipient</th>
                    <th className="px-4 py-3 text-left font-medium">Location</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No orders assigned yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order: any) => (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {order.id.slice(0, 10)}…
                        </td>
                        <td className="px-4 py-3 font-medium">{order.recipientName}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.deliveryCity}, {order.deliveryState}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalOrderPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Page {ordersPage} of {totalOrderPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={ordersPage <= 1} onClick={() => setOrdersPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={ordersPage >= totalOrderPages} onClick={() => setOrdersPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <VendorFormModal open={modalOpen} onClose={() => setModalOpen(false)} vendor={vendor} />
    </div>
  );
}

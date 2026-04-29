'use client';

import { useState } from 'react';
import {
  useAdminOrders, useAdminOrder, useUpdateOrderStatus,
  useRefundOrder, useDeleteOrder,
} from '@/hooks/use-admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, RefreshCw, Eye, Copy, Trash2, ExternalLink } from 'lucide-react';

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  REFUNDED: 'bg-red-100 text-red-800',
};

const paymentColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  SUCCEEDED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

function fmt(cents: number, currency: string) {
  const sym: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };
  return `${sym[currency] ?? currency}${(cents / 100).toFixed(2)}`;
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data: order, isLoading } = useAdminOrder(orderId);
  const refund = useRefundOrder();
  const deleteOrder = useDeleteOrder();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleRefund = () => {
    if (!order) return;
    if (!confirm('Issue a full refund for this order? This cannot be undone.')) return;
    refund.mutate(order.id);
  };

  const handleDelete = () => {
    if (!order) return;
    deleteOrder.mutate(order.id, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Order Details
            {order && (
              <span className="font-mono text-sm text-muted-foreground">
                #{order.id.slice(-8).toUpperCase()}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-5 text-sm">

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[order.status] ?? ''}`}>
                {order.status}
              </span>
              {order.payment && (
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentColors[order.payment.status] ?? ''}`}>
                  Payment: {order.payment.status}
                </span>
              )}
              {order.bundle && (
                <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                  {order.bundle.name}
                </span>
              )}
            </div>

            <Separator />

            {/* IDs */}
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Order ID</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded break-all">{order.id}</code>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyText(order.id)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {order.payment?.stripePaymentIntentId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Stripe Payment Intent</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded break-all">{order.payment.stripePaymentIntentId}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyText(order.payment!.stripePaymentIntentId)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Customer + Recipient */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Customer</p>
                <p className="font-medium">{order.user?.username ?? '—'}</p>
                <p className="text-muted-foreground">{order.user?.email ?? '—'}</p>
                <p className="text-muted-foreground text-xs mt-0.5">ID: {order.user?.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Recipient</p>
                <p className="font-medium">{order.recipientName}</p>
                <p className="text-muted-foreground">{order.recipientPhone}</p>
                <p className="text-muted-foreground mt-1">{order.deliveryStreet}</p>
                <p className="text-muted-foreground">{order.deliveryCity}, {order.deliveryState}</p>
                <p className="text-muted-foreground">{order.deliveryCountry}</p>
              </div>
            </div>

            <Separator />

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Items</p>
                  <div className="space-y-1">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                        </span>
                        <span className="font-medium">{fmt(item.price, order.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Pricing */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Pricing</p>
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{fmt(order.subtotal, order.currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span><span>{order.tax > 0 ? fmt(order.tax, order.currency) : 'None'}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t mt-1">
                  <span>Total</span><span>{fmt(order.total, order.currency)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Vendor + Invoice */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Vendor</p>
                {order.vendor ? (
                  <p className="font-medium">{order.vendor.name}</p>
                ) : (
                  <p className="text-muted-foreground italic">Not assigned</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Invoice</p>
                {order.invoice?.pdfUrl ? (
                  <a
                    href={order.invoice.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    Download PDF <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-muted-foreground italic">Not generated</p>
                )}
              </div>
            </div>

            {/* Personal message + admin notes */}
            {(order.personalMessage || order.adminNotes) && (
              <>
                <Separator />
                <div className="space-y-3">
                  {order.personalMessage && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Personal Message</p>
                      <p className="italic text-muted-foreground">"{order.personalMessage}"</p>
                    </div>
                  )}
                  {order.adminNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Admin Notes</p>
                      <p className="text-foreground">{order.adminNotes}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="flex gap-6 text-xs text-muted-foreground">
              <span>Created: {new Date(order.createdAt).toLocaleString()}</span>
              <span>Updated: {new Date(order.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4 border-t">
          {/* Delete — left side */}
          <div>
            {!confirmingDelete ? (
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmingDelete(true)}
                disabled={!order || deleteOrder.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Order
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive font-medium">This cannot be undone.</span>
                <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteOrder.isPending}>
                  {deleteOrder.isPending ? <Spinner size="sm" className="mr-1" /> : null}
                  Confirm Delete
                </Button>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex gap-2">
            {order && order.status !== 'REFUNDED' && order.status !== 'CANCELLED' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={handleRefund}
                disabled={refund.isPending}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refund
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Update Status Dialog ─────────────────────────────────────────────────────

function UpdateStatusDialog({ order, onClose }: { order: any; onClose: () => void }) {
  const [newStatus, setNewStatus] = useState(order.status);
  const [adminNotes, setAdminNotes] = useState('');
  const updateStatus = useUpdateOrderStatus();

  const handleSubmit = () => {
    updateStatus.mutate(
      { id: order.id, status: newStatus, adminNotes: adminNotes || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Admin Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this status change..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminOrders(page);

  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [updateOrder, setUpdateOrder] = useState<any>(null);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  }

  const orders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground text-sm">Manage customer orders, update statuses, and process refunds.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Vendor</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order: any) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{order.user?.username}</div>
                        <div className="text-xs text-muted-foreground">{order.user?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status] ?? ''}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.vendor?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setDetailOrderId(order.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUpdateOrder(order)}
                          >
                            Update
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages} ({meta.total} orders)
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

      {detailOrderId && (
        <OrderDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />
      )}

      {updateOrder && (
        <UpdateStatusDialog order={updateOrder} onClose={() => setUpdateOrder(null)} />
      )}
    </div>
  );
}

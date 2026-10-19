'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useAdminOrders, useAdminOrder, useUpdateOrderStatus,
  useRefundOrder, useDeleteOrder, useAssignVendor, useVendors,
  useReconcilePayments, useCancelTestModeOrders, type ReconcileResult,
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
import { ChevronLeft, ChevronRight, RefreshCw, Eye, Copy, Trash2, ExternalLink, UserCheck, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DeliveryProofSection } from './delivery-proof-section';
import { VendorLinkSection } from './vendor-link-section';
import { CustomOrderSection, customOrderStatusBlock, customOrderVendorBlock } from './custom-order-section';
import { ADMIN_STAGE, type QuoteStatus } from '@/lib/custom-orders';

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

/** The order reference shown everywhere in admin: #, last 8 chars, uppercase. */
function shortId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

/**
 * Where a custom gift request is, as a badge. Null for every other order.
 *
 * Custom requests are created with a zero total on purpose — the price only
 * exists once an admin quotes them — so without this they render as an
 * ordinary "PENDING $0.00" row, indistinguishable from a broken order.
 */
function QuoteStageBadge({ quoteStatus }: { quoteStatus?: QuoteStatus | null }) {
  if (!quoteStatus) return null;
  const stage = ADMIN_STAGE[quoteStatus];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${stage.className}`}>
      Custom · {stage.label}
    </span>
  );
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
}

/** Signed CAD, for the FX differential. Negative = Luvngift absorbed a loss. */
function fmtSignedCad(cents: number) {
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
  return `${sign}CA$${(Math.abs(cents) / 100).toFixed(2)}`;
}

const refundStatusColors: Record<string, string> = {
  succeeded: 'text-green-700',
  pending: 'text-amber-700',
  failed: 'text-red-700',
  canceled: 'text-red-700',
};

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data: order, isLoading } = useAdminOrder(orderId);
  const refund = useRefundOrder();
  const deleteOrder = useDeleteOrder();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  // The status control used to exist only as a button at the end of each table
  // row — off-screen on a phone, and absent from this panel, which is where a
  // custom order is worked on (and where alert emails land).
  const [statusTarget, setStatusTarget] = useState<string | null>(null);

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
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[order.status] ?? ''}`}>
                {order.status}
              </span>
              <QuoteStageBadge quoteStatus={order.quoteStatus} />
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
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-7"
                onClick={() => setStatusTarget(order.status)}
              >
                Change status
              </Button>
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

            {/* Custom request: what was asked for, then the quote conversation */}
            {order.quoteStatus && (
              <>
                <Separator />
                {order.specialInstructions && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Request</p>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">{order.specialInstructions}</pre>
                  </div>
                )}
                <CustomOrderSection order={order} onChangeStatus={setStatusTarget} />
              </>
            )}

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
                        {/* Bundle items carry no individual price — a bundle is
                            priced as a whole, and OrderItem.price is 0 only
                            because the column is non-nullable. Rendering that
                            as CA$0.00 reads like a pricing bug. Subscription
                            cycle items DO have real per-item prices, so show
                            the amount whenever there is one. */}
                        {item.price > 0 ? (
                          <span className="font-medium">{fmt(item.price, order.currency)}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Included in bundle</span>
                        )}
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
              {order.quoteStatus === 'AWAITING_QUOTE' && (
                <p className="mt-2 rounded-md border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                  This is a custom request, so it has no price until you quote it below —
                  it is not a free order.
                </p>
              )}
            </div>

            <Separator />

            {/* Substitutions + proof of delivery */}
            <DeliveryProofSection order={order} />

            <Separator />

            {/* Refund + FX differential */}
            {order.payment?.refundId && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Refund</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stripe status</span>
                      <span className={`font-semibold ${refundStatusColors[order.payment.refundStatus ?? ''] ?? ''}`}>
                        {order.payment.refundStatus ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Amount refunded</span>
                      <span>
                        {order.payment.refundAmount != null
                          ? fmt(order.payment.refundAmount, order.currency)
                          : '—'}
                      </span>
                    </div>
                    {order.payment.refundedAt && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Refunded at</span>
                        <span>{new Date(order.payment.refundedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {order.payment.refundCadRate != null && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>CAD rate, purchase → refund</span>
                        <span className="font-mono text-xs">
                          {order.cadExchangeRate?.toFixed(4)} → {order.payment.refundCadRate.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {order.payment.refundFxDeltaCad != null && (
                      <div className="flex justify-between pt-1 border-t mt-1 font-medium">
                        <span>FX impact (absorbed by Luvngift)</span>
                        <span className={order.payment.refundFxDeltaCad < 0 ? 'text-red-700' : 'text-green-700'}>
                          {fmtSignedCad(order.payment.refundFxDeltaCad)}
                        </span>
                      </div>
                    )}
                  </div>

                  {order.payment.refundStatus && order.payment.refundStatus !== 'succeeded' && (
                    <p className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                      {order.payment.refundStatus === 'pending'
                        ? 'Stripe has not confirmed this refund yet. It will reconcile automatically when the webhook arrives.'
                        : 'This refund did not succeed. The customer has not been credited — resolve manually in Stripe.'}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded break-all">{order.payment.refundId}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyText(order.payment!.refundId!)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Vendor + Invoice */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Vendor</p>
                {order.vendor ? (
                  <p className="font-medium">{order.vendor.name}</p>
                ) : (
                  <p className="text-muted-foreground italic mb-1">Not assigned</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1"
                  onClick={() => setShowAssign(true)}
                  disabled={!!customOrderVendorBlock(order)}
                >
                  <UserCheck className="h-3 w-3" />
                  {order.vendor ? 'Reassign vendor' : 'Assign vendor'}
                </Button>
                {customOrderVendorBlock(order) && (
                  <p className="mt-1 text-xs text-muted-foreground">{customOrderVendorBlock(order)}</p>
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

            {/* Vendor status link — only renders once a vendor is assigned. */}
            <VendorLinkSection orderId={order.id} />

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

        {showAssign && order && (
          <AssignVendorDialog order={order} onClose={() => setShowAssign(false)} />
        )}

        {statusTarget && order && (
          <UpdateStatusDialog
            order={order}
            initialStatus={statusTarget}
            onClose={() => setStatusTarget(null)}
          />
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

function UpdateStatusDialog({
  order,
  onClose,
  initialStatus,
}: {
  order: any;
  onClose: () => void;
  /** Preselect a status, e.g. CANCELLED from a custom order's "Cancel request". */
  initialStatus?: string;
}) {
  const [newStatus, setNewStatus] = useState(initialStatus ?? order.status);
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
                {ORDER_STATUSES.map((s) => {
                  const blocked = customOrderStatusBlock(order, s);
                  return (
                    <SelectItem key={s} value={s} disabled={!!blocked}>
                      {s}{blocked ? ` — ${blocked}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {order.quoteStatus && newStatus === 'CANCELLED' && order.status !== 'CANCELLED' && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Cancelling withdraws any open quote and closes the conversation. The customer is
              emailed that the order was cancelled — if you want to tell them why, send a
              message from the order first.
            </p>
          )}
          {order.quoteStatus && order.status === 'CANCELLED' && newStatus === 'PENDING' && (
            <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              Reopening lets you message the customer and send a new quote again.
            </p>
          )}
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

// ─── Assign Vendor Dialog ─────────────────────────────────────────────────────

function AssignVendorDialog({ order, onClose }: { order: any; onClose: () => void }) {
  const [vendorId, setVendorId] = useState(order.vendor?.id ?? '');
  const { data: vendorsData, isLoading } = useVendors(1, 100);
  const assign = useAssignVendor();

  const vendors = vendorsData?.vendors ?? [];

  const handleSubmit = () => {
    if (!vendorId) return;
    assign.mutate({ orderId: order.id, vendorId }, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Vendor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Order <span className="font-mono font-medium">#{order.id.slice(-8).toUpperCase()}</span>
              {' '}— recipient: <span className="font-medium">{order.recipientName}</span>
            </p>
            {order.vendor && (
              <p className="text-xs text-muted-foreground">
                Currently assigned to: <span className="font-medium">{order.vendor.name}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Select vendor</Label>
            {isLoading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : vendors.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No active vendors. Add vendors first.
              </p>
            ) : (
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="font-medium">{v.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        · {v.state} · {v.businessType}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Assigning a vendor will move the order to <strong>PROCESSING</strong> and notify the vendor by email and SMS.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!vendorId || assign.isPending || vendors.length === 0}
          >
            {assign.isPending ? 'Assigning...' : 'Assign Vendor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Asks Stripe for the real payment status of every PENDING order and completes
 * the ones that actually paid.
 *
 * Always previews first. The apply step sends confirmation emails and queues
 * invoices, so it must never run on a click-through — a buyer receiving a
 * confirmation for an order that was not paid is worse than the stranding.
 */
function ReconcilePaymentsDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ReconcileResult | null>(null);
  const reconcile = useReconcilePayments();
  const cancelTestMode = useCancelTestModeOrders();

  function start() {
    setPreview(null);
    setOpen(true);
    reconcile.mutate({ dryRun: true }, { onSuccess: setPreview });
  }

  function apply() {
    reconcile.mutate(
      { dryRun: false },
      {
        onSuccess: () => {
          setOpen(false);
          setPreview(null);
        },
      },
    );
  }

  const busy = reconcile.isPending || cancelTestMode.isPending;
  const recoverable = preview?.recovered.length ?? 0;
  const testModeIds = preview?.testMode ?? [];

  function clearTestMode() {
    cancelTestMode.mutate(testModeIds, {
      onSuccess: () => reconcile.mutate({ dryRun: true }, { onSuccess: setPreview }),
    });
  }

  return (
    <>
      <Button variant="outline" onClick={start} disabled={busy}>
        <ShieldCheck className="mr-2 h-4 w-4" />
        Reconcile payments
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reconcile stranded payments</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Checks every pending order against Stripe and completes the ones that were
              really paid. Orders that were not paid are left untouched.
            </p>

            {busy && !preview && (
              <div className="flex items-center gap-2 py-6">
                <Spinner />
                <span className="text-muted-foreground">Asking Stripe…</span>
              </div>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border p-3">
                    <div className="text-xl font-semibold">{preview.scanned}</div>
                    <div className="text-muted-foreground text-xs">Pending checked</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xl font-semibold text-green-700">{recoverable}</div>
                    <div className="text-muted-foreground text-xs">Paid but stuck</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xl font-semibold">{preview.stillUnpaid.length}</div>
                    <div className="text-muted-foreground text-xs">Genuinely unpaid</div>
                  </div>
                </div>

                {testModeIds.length > 0 && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="font-medium">
                      {testModeIds.length} test-mode leftover{testModeIds.length === 1 ? '' : 's'}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Created before the Stripe key was switched to live, so no real payment
                      was ever taken and they can never be recovered. Cancelling them keeps
                      the record but clears them out of pending.
                    </p>
                    <p className="mt-2 font-mono text-xs">
                      {testModeIds.map(shortId).join(', ')}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={clearTestMode}
                      disabled={busy}
                    >
                      {cancelTestMode.isPending ? 'Cancelling…' : 'Cancel these orders'}
                    </Button>
                  </div>
                )}

                {recoverable > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        Applying this moves {recoverable} order{recoverable === 1 ? '' : 's'} to
                        PROCESSING and sends {recoverable === 1 ? 'its' : 'their'} confirmation
                        email and invoice. {recoverable === 1 ? 'This buyer has' : 'These buyers have'} already been charged.
                      </p>
                    </div>
                  </div>
                )}

                {preview.failed.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
                    <p className="font-medium">Could not be checked</p>
                    <ul className="mt-1 space-y-1">
                      {preview.failed.map((f) => (
                        <li key={f.orderId} className="font-mono text-xs">
                          {shortId(f.orderId)} — {f.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recoverable === 0 && preview.failed.length === 0 && testModeIds.length === 0 && (
                  <p className="text-muted-foreground">
                    Nothing to recover. Every pending order matches Stripe.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Close
            </Button>
            <Button onClick={apply} disabled={busy || recoverable === 0}>
              {busy && preview ? 'Recovering…' : `Recover ${recoverable || ''} order${recoverable === 1 ? '' : 's'}`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminOrders(page);

  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Admin alert emails deep-link to `?order=<id>` so an alert opens the order
  // it is about, rather than the first page of every order.
  const linkedOrderId = searchParams.get('order');
  useEffect(() => {
    if (linkedOrderId && /^[a-z0-9]{25}$/.test(linkedOrderId)) setDetailOrderId(linkedOrderId);
  }, [linkedOrderId]);
  const [updateOrder, setUpdateOrder] = useState<any>(null);
  const [assignOrder, setAssignOrder] = useState<any>(null);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  }

  const orders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">Manage customer orders, update statuses, and process refunds.</p>
        </div>
        <ReconcilePaymentsDialog />
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
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status] ?? ''}`}>
                            {order.status}
                          </span>
                          <QuoteStageBadge quoteStatus={order.quoteStatus} />
                        </div>
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
                            className="gap-1"
                            onClick={() => setAssignOrder(order)}
                            disabled={!!customOrderVendorBlock(order)}
                            title={customOrderVendorBlock(order) ?? undefined}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {order.vendor ? 'Reassign' : 'Assign'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUpdateOrder(order)}
                          >
                            Status
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
        <OrderDetailModal
          orderId={detailOrderId}
          onClose={() => {
            setDetailOrderId(null);
            // Clear the deep link, or opening the same order again from an alert
            // would not change the URL and the panel would stay shut.
            if (linkedOrderId) router.replace('/admin/orders', { scroll: false });
          }}
        />
      )}

      {updateOrder && (
        <UpdateStatusDialog order={updateOrder} onClose={() => setUpdateOrder(null)} />
      )}

      {assignOrder && (
        <AssignVendorDialog order={assignOrder} onClose={() => setAssignOrder(null)} />
      )}
    </div>
  );
}

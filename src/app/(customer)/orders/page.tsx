'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ChevronRight, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { useMyOrders } from '@/hooks/use-orders';
import { useCreatePaymentIntent, useVerifyPayment } from '@/hooks/use-checkout';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { OrderStatus } from '@luvngift/shared';
import type { Order } from '@luvngift/shared';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const currencySymbols: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useMyOrders(page);
  const { mutateAsync: createPaymentIntent } = useCreatePaymentIntent();

  const [resumeOrder, setResumeOrder] = useState<Order | null>(null);
  const [resumeClientSecret, setResumeClientSecret] = useState<string | null>(null);
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null);

  const handleResume = async (order: Order) => {
    if (resumingOrderId) return;
    setResumingOrderId(order.id);
    try {
      const { clientSecret } = await createPaymentIntent({ orderId: order.id });
      setResumeOrder(order);
      setResumeClientSecret(clientSecret);
    } catch {
      // error handled in hook
    } finally {
      setResumingOrderId(null);
    }
  };

  const handleResumeClose = () => {
    setResumeOrder(null);
    setResumeClientSecret(null);
  };

  const handleResumeSuccess = (orderId: string) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    handleResumeClose();
    router.push(`/orders/${orderId}`);
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/occasions">Shop more</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <div className="text-center py-20 text-muted-foreground">
          Unable to load orders. Please try again.
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="text-center py-20">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No orders yet.</p>
          <Button asChild>
            <Link href="/occasions">Browse occasions</Link>
          </Button>
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="space-y-3">
            {data.data.map((order) => {
              const symbol = currencySymbols[order.currency] ?? order.currency;
              const total = (order.total / 100).toFixed(2);
              const needsPayment =
                order.status === 'PENDING' &&
                !!order.bundleId &&
                order.payment?.status !== 'SUCCEEDED';

              return (
                <Card key={order.id} className={needsPayment ? 'border-amber-200 bg-amber-50/30' : ''}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono text-muted-foreground">
                            #{order.id.slice(-8).toUpperCase()}
                          </span>
                          <OrderStatusBadge status={order.status as OrderStatus} />
                        </div>
                        <p className="font-medium truncate">For {order.recipientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.deliveryCity}, {order.deliveryState} · {order.items?.length ?? 0} item(s)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="font-semibold">{symbol}{total}</span>
                        {needsPayment ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1.5"
                            disabled={resumingOrderId === order.id}
                            onClick={() => handleResume(order)}
                          >
                            {resumingOrderId === order.id ? <Spinner size="sm" /> : <CreditCard className="h-3.5 w-3.5" />}
                            Complete payment
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost" className="gap-1">
                            <Link href={`/orders/${order.id}`}>
                              View <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>

                    {needsPayment && (
                      <p className="text-xs text-amber-700 mt-3 pt-3 border-t border-amber-100">
                        Payment not completed — click "Complete payment" to finish your order.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {data.meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {data.meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Resume payment dialog */}
      {resumeOrder && (
        <Dialog open={!!resumeClientSecret} onOpenChange={(open) => { if (!open) handleResumeClose(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete your payment</DialogTitle>
              <DialogDescription>
                Finish paying for your gift to {resumeOrder.recipientName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm border rounded-lg p-4 bg-muted/30">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order</span>
                <span className="font-mono text-xs">#{resumeOrder.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient</span>
                <span>{resumeOrder.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivering to</span>
                <span>{resumeOrder.deliveryCity}, {resumeOrder.deliveryState}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total due</span>
                <span>
                  {currencySymbols[resumeOrder.currency] ?? resumeOrder.currency}
                  {(resumeOrder.total / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {resumeClientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret: resumeClientSecret, appearance: { theme: 'stripe' } }}>
                <ResumePaymentForm
                  orderId={resumeOrder.id}
                  onBack={handleResumeClose}
                  onSuccess={() => handleResumeSuccess(resumeOrder.id)}
                />
              </Elements>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ResumePaymentForm({ orderId, onBack, onSuccess }: { orderId: string; onBack: () => void; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { mutateAsync: verifyPayment } = useVerifyPayment();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setIsProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}?success=true`,
      },
      redirect: 'if_required',
    });
    if (error) {
      toast.error(error.message ?? 'Payment failed. Please try again.');
      setIsProcessing(false);
    } else {
      // Verify with Stripe server-side immediately — don't wait for webhook.
      await verifyPayment({ orderId });
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ business: { name: 'Luvngift' } }} />
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isProcessing} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handlePay} disabled={isProcessing || !stripe} className="flex-1">
          {isProcessing ? <><Spinner size="sm" className="mr-2" />Processing...</> : 'Pay now'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { use, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, MapPin, Phone, MessageSquare } from 'lucide-react';
import { useOrder } from '@/hooks/use-orders';
import { useDeliveryWindow } from '@/hooks/use-subscriptions';
import { formatDeliveryDates } from '@/lib/delivery';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { OrderTimeline } from '@/components/orders/order-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { OrderStatus } from '@luvngift/shared';
import { useOrderLive } from '@/hooks/use-order-live';
import { CustomOrderConversation } from '@/components/orders/custom-order-conversation';
import type { QuoteStatus } from '@/lib/custom-orders';

const currencySymbols: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

interface Props {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: order, isLoading, isError } = useOrder(id);
  const { data: deliveryWindow } = useDeliveryWindow();

  // Show success toast and strip sensitive Stripe params from URL
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful! Your order is confirmed.');
      router.replace(`/orders/${id}`, { scroll: false });
    }
  }, [searchParams, id, router]);

  // Real-time status and conversation updates via Socket.io.
  const onStatus = useCallback((status: string) => toast.info(`Order status updated: ${status}`), []);
  useOrderLive(id, [['orders', id], ['orders', id, 'conversation']], onStatus);

  if (isLoading) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;
  }

  if (isError || !order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Order not found.</p>
        <Button variant="outline" asChild>
          <Link href="/orders"><ArrowLeft className="h-4 w-4 mr-2" />My orders</Link>
        </Button>
      </div>
    );
  }

  const symbol = currencySymbols[order.currency] ?? order.currency;
  const quoteStatus = (order as { quoteStatus?: QuoteStatus | null }).quoteStatus ?? null;
  const subtotal = (order.subtotal / 100).toFixed(2);
  const tax = (order.tax / 100).toFixed(2);
  const total = (order.total / 100).toFixed(2);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> My orders
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            <OrderStatusBadge status={order.status as OrderStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        {order.invoiceUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Invoice
            </a>
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Timeline + Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom request: the quote conversation, then what was originally asked for */}
          {quoteStatus && (
            <CustomOrderConversation
              order={order as any}
              onPaid={() => toast.success('Payment successful! Your order is confirmed.')}
            />
          )}
          {/* Order tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline status={order.status as OrderStatus} />
            </CardContent>
          </Card>

          {/* Expected delivery — hidden once it's actually arrived */}
          {(order as any).preferredDeliveryDate &&
            !(order as any).deliveryProofUrl &&
            order.status !== 'DELIVERED' &&
            order.status !== 'CANCELLED' &&
            order.status !== 'REFUNDED' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Expected delivery</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">
                    {formatDeliveryDates(
                      (order as any).preferredDeliveryDate,
                      deliveryWindow?.windowDays ?? 0,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We promise a range rather than a single day — you&apos;ll get a photo the
                    moment it arrives.
                  </p>
                </CardContent>
              </Card>
            )}

          {/* Proof of delivery */}
          {(order as any).deliveryProofUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivered</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href={(order as any).deliveryProofUrl} target="_blank" rel="noopener noreferrer">
                  {/* Cloudinary-hosted; outside next/image's configured domains */}
                  <img
                    src={(order as any).deliveryProofUrl}
                    alt="Photo taken on delivery"
                    className="rounded-md border w-full object-cover"
                  />
                </a>
                <p className="text-xs text-muted-foreground">
                  Photographed on arrival
                  {(order as any).deliveryProofAt
                    ? ` — ${new Date((order as any).deliveryProofAt).toLocaleString()}`
                    : ''}
                  {(order as any).deliveryProofNote ? `. ${(order as any).deliveryProofNote}` : ''}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items.map((item: any) => (
                  <div key={item.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className={item.isOmitted ? 'text-muted-foreground line-through' : ''}>
                        {item.quantity > 1 && (
                          <span className="text-muted-foreground mr-1">{item.quantity}×</span>
                        )}
                        {item.name}
                      </span>
                      {/* Bundle items have no individual price (a bundle is priced as a whole; OrderItem.price is 0 only because the column is non-nullable). Showing 0.00 reads as free. Subscription cycle items DO carry real prices. */}
                      {item.price > 0 ? (
                        <span className="font-medium">{symbol}{(item.price / 100).toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Included</span>
                      )}
                    </div>

                    {/* Substitution transparency — clause 9 of the substitution policy */}
                    {item.substitutedForName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Replaced <span className="font-medium">{item.substitutedForName}</span>
                        {item.substitutionReason ? ` — ${item.substitutionReason}` : ''}
                      </p>
                    )}
                    {item.isOmitted && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        Unavailable this time
                        {item.substitutionReason ? ` — ${item.substitutionReason}` : ''}. We&apos;ll
                        make it good on your next delivery or refund it.
                      </p>
                    )}
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{symbol}{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax</span><span>{symbol}{tax}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span><span>{symbol}{total}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {order.specialInstructions && order.specialInstructions.startsWith('[CUSTOM REQUEST]') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What you asked for</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                  {order.specialInstructions}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Recipient + message */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recipient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{order.recipientName}</p>
                  <p className="text-muted-foreground">{order.recipientPhone}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-muted-foreground">
                  {order.deliveryStreet !== 'TBD' && <p>{order.deliveryStreet}</p>}
                  <p>{order.deliveryCity}, {order.deliveryState}</p>
                  <p>{order.deliveryCountry}</p>
                </div>
              </div>
              {order.preferredDeliveryDate && (
                <div className="text-muted-foreground text-xs pt-1">
                  Preferred delivery: {new Date(order.preferredDeliveryDate).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {order.personalMessage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Personal message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm italic text-muted-foreground">"{order.personalMessage}"</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ChevronRight, CreditCard, MessageSquareQuote } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMyOrders } from '@/hooks/use-orders';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { PayOrderDialog } from '@/components/orders/pay-order-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { OrderStatus } from '@luvngift/shared';
import type { Order } from '@luvngift/shared';
import { CUSTOMER_STAGE, type QuoteStatus } from '@/lib/custom-orders';

type ListedOrder = Order & { quoteStatus?: QuoteStatus | null };

/**
 * Payable from the list: an unpaid bundle checkout, or a custom request whose
 * quote is accepted. A custom request at any earlier stage has no agreed price.
 */
function needsPayment(order: ListedOrder): boolean {
  if (order.status !== 'PENDING' || order.payment?.status === 'SUCCEEDED') return false;
  if (order.quoteStatus) return order.quoteStatus === 'ACCEPTED';
  return !!order.bundleId;
}

/** A custom request waiting on the customer to read or answer something. */
function awaitsCustomer(order: ListedOrder): boolean {
  return order.status === 'PENDING' && order.quoteStatus === 'QUOTED';
}

const currencySymbols: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useMyOrders(page);
  const [payingOrder, setPayingOrder] = useState<ListedOrder | null>(null);

  const handlePaid = (orderId: string) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setPayingOrder(null);
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
            {(data.data as ListedOrder[]).map((order) => {
              const symbol = currencySymbols[order.currency] ?? order.currency;
              const total = (order.total / 100).toFixed(2);
              const payable = needsPayment(order);
              const highlighted = payable || awaitsCustomer(order);

              return (
                <Card key={order.id} className={highlighted ? 'border-amber-200 bg-amber-50/30' : ''}>
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
                        {/* An unpriced custom request has no total worth showing. */}
                        {order.total > 0 && <span className="font-semibold">{symbol}{total}</span>}
                        {payable ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1.5"
                            onClick={() => setPayingOrder(order)}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Complete payment
                          </Button>
                        ) : awaitsCustomer(order) ? (
                          <Button asChild size="sm" className="gap-1.5">
                            <Link href={`/orders/${order.id}`}>
                              <MessageSquareQuote className="h-3.5 w-3.5" />
                              Review quote
                            </Link>
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

                    {payable && (
                      <p className="text-xs text-amber-700 mt-3 pt-3 border-t border-amber-100">
                        Payment not completed — click "Complete payment" to finish your order.
                      </p>
                    )}
                    {order.quoteStatus && order.status === 'PENDING' && !payable && (
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                        Custom gift · {CUSTOMER_STAGE[order.quoteStatus]}
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

      <PayOrderDialog
        order={payingOrder}
        onClose={() => setPayingOrder(null)}
        onPaid={handlePaid}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import { useMyOrders } from '@/hooks/use-orders';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { OrderStatus } from '@luvngift/shared';

const currencySymbols: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useMyOrders(page);

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
              return (
                <Link key={order.id} href={`/orders/${order.id}`} className="block group">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono text-muted-foreground">
                              #{order.id.slice(-8).toUpperCase()}
                            </span>
                            <OrderStatusBadge status={order.status as OrderStatus} />
                          </div>
                          <p className="font-medium truncate">
                            For {order.recipientName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.deliveryCity}, {order.deliveryState} · {order.items?.length ?? 0} item(s)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold">{symbol}{total}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

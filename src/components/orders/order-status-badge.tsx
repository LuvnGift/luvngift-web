import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@luvngift/shared';

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' }> = {
  [OrderStatus.PENDING]: { label: 'Pending', variant: 'warning' },
  [OrderStatus.PROCESSING]: { label: 'Processing', variant: 'default' },
  [OrderStatus.SHIPPED]: { label: 'Shipped', variant: 'secondary' },
  [OrderStatus.DELIVERED]: { label: 'Delivered', variant: 'success' },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
  [OrderStatus.REFUNDED]: { label: 'Refunded', variant: 'outline' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

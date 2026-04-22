import { CheckCircle, Circle, Clock } from 'lucide-react';
import { OrderStatus } from '@luvngift/shared';
import { cn } from '@/lib/utils';

const STEPS: { status: OrderStatus; label: string; description: string }[] = [
  { status: OrderStatus.PENDING, label: 'Order placed', description: 'We received your order' },
  { status: OrderStatus.PROCESSING, label: 'Processing', description: 'Your order is being prepared' },
  { status: OrderStatus.SHIPPED, label: 'On the way', description: 'Your gift is being delivered' },
  { status: OrderStatus.DELIVERED, label: 'Delivered', description: 'Gift delivered to recipient' },
];

const ORDER: Record<OrderStatus, number> = {
  [OrderStatus.PENDING]: 0,
  [OrderStatus.PROCESSING]: 1,
  [OrderStatus.SHIPPED]: 2,
  [OrderStatus.DELIVERED]: 3,
  [OrderStatus.CANCELLED]: -1,
  [OrderStatus.REFUNDED]: -1,
};

interface OrderTimelineProps {
  status: OrderStatus;
}

export function OrderTimeline({ status }: OrderTimelineProps) {
  const currentIndex = ORDER[status] ?? -1;

  if (status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm">
        <Circle className="h-4 w-4" />
        <span>Order {status.toLowerCase()}</span>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              ) : isCurrent ? (
                <Clock className="h-5 w-5 text-primary shrink-0 animate-pulse" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              {index < STEPS.length - 1 && (
                <div className={cn('w-px flex-1 my-1', isCompleted ? 'bg-green-500' : 'bg-border')} />
              )}
            </div>
            <div className="pb-4">
              <p className={cn('text-sm font-medium', isPending && 'text-muted-foreground')}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

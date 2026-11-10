import { CheckCircle, Circle, Clock, Heart } from 'lucide-react';
import { OrderStatus } from '@luvngift/shared';
import { cn } from '@/lib/utils';

/**
 * The order's progress, with who has it at each step. Milestones come from the
 * API's custody timeline and name a ROLE ("our delivery partner"), never a
 * person: the buyer needs to know the gift is moving, not who is carrying it.
 */

export interface OrderEvent {
  kind: 'PARTNER_ASSIGNED' | 'ITEMS_SOURCED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RECIPIENT_CONFIRMED';
  role: 'SOURCING' | 'AGENT' | 'DELIVERY' | null;
  createdAt: string;
}

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

/** Which step a milestone belongs under, and how it reads to the buyer. */
function milestone(e: OrderEvent): { step: OrderStatus; text: string } | null {
  switch (e.kind) {
    case 'PARTNER_ASSIGNED':
      if (e.role === 'DELIVERY') return { step: OrderStatus.PROCESSING, text: 'A delivery partner was arranged' };
      if (e.role === 'SOURCING') return null; // part of the local partner taking it on
      return { step: OrderStatus.PROCESSING, text: 'Our local partner in Nigeria has your order' };
    case 'ITEMS_SOURCED':
      return { step: OrderStatus.PROCESSING, text: 'Everything for the gift has been bought' };
    case 'OUT_FOR_DELIVERY':
      return { step: OrderStatus.SHIPPED, text: 'With our delivery partner' };
    case 'DELIVERED':
      return { step: OrderStatus.DELIVERED, text: 'Handed over, with a photo' };
    case 'RECIPIENT_CONFIRMED':
      return { step: OrderStatus.DELIVERED, text: 'The recipient confirmed receiving it' };
  }
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

interface OrderTimelineProps {
  status: OrderStatus;
  events?: OrderEvent[];
}

export function OrderTimeline({ status, events = [] }: OrderTimelineProps) {
  const currentIndex = ORDER[status] ?? -1;

  if (status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm">
        <Circle className="h-4 w-4" />
        <span>Order {status.toLowerCase()}</span>
      </div>
    );
  }

  const milestones = events
    .map((e) => ({ ...e, m: milestone(e) }))
    .filter((e): e is OrderEvent & { m: { step: OrderStatus; text: string } } => e.m !== null);

  return (
    <ol className="space-y-4">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        const under = milestones.filter((e) => e.m.step === step.status);

        return (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              {isCompleted || (isCurrent && step.status === OrderStatus.DELIVERED) ? (
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
              {under.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {under.map((e, i) => (
                    <li key={`${e.kind}-${i}`} className="flex items-center gap-1.5 text-xs">
                      {e.kind === 'RECIPIENT_CONFIRMED' && <Heart className="h-3 w-3 text-primary" />}
                      <span className={e.kind === 'RECIPIENT_CONFIRMED' ? 'font-medium text-foreground' : 'text-foreground/80'}>{e.m.text}</span>
                      <span className="text-muted-foreground">· {when(e.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

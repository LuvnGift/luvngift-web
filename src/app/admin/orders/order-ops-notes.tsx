'use client';

import { NotesPanel } from '@/components/ops/ops-ui';
import { useOpsNotes } from '@/hooks/use-ops';

/**
 * The order's notes and flags from the ops dashboard, in the admin order
 * panel. Admin can add one and resolve flags here. Hidden while there are none
 * and the order is unpaid (staff only see paid orders, so none can exist).
 */
export function OrderOpsNotes({ orderId }: { orderId: string }) {
  const { data } = useOpsNotes({ page: 1, targetType: 'ORDER', targetId: orderId });
  if (!data || data.data.length === 0) return null;
  return <NotesPanel targetType="ORDER" targetId={orderId} />;
}

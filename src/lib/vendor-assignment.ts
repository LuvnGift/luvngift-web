/**
 * Why an order cannot go to a vendor right now, or null. Mirrors
 * `vendorAssignmentBlock` in luvngift-api/src/services/vendor-assignment.service.ts,
 * which is the rule that is actually enforced — this only greys the button out
 * and explains why. Change both.
 *
 * Subscription cycles have no payment row: Stripe Billing collected before the
 * order was created, so the order existing means it was paid.
 */
export function vendorAssignmentBlock(order: {
  status: string;
  subscriptionId?: string | null;
  payment?: { status: string } | null;
}): string | null {
  switch (order.status) {
    case 'CANCELLED':
      return 'Cancelled orders cannot go to a vendor';
    case 'REFUNDED':
      return 'Refunded orders cannot go to a vendor';
    case 'SHIPPED':
      return 'Already on its way — reassigning would brief a second vendor';
    case 'DELIVERED':
      return 'Already delivered';
  }
  if (!order.subscriptionId && order.payment?.status !== 'SUCCEEDED') {
    return 'Not paid yet — a vendor is briefed only once payment lands';
  }
  return null;
}

/** Only an approved, active vendor may be assigned (the API refuses anyone else). */
export function isVendorAssignable(vendor: { isActive?: boolean; status?: string }): boolean {
  return vendor.isActive !== false && vendor.status === 'APPROVED';
}

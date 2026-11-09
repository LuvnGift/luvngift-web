'use client';

import { useSubscriptionRules } from '@/hooks/use-admin';

/**
 * What the vendor is owed for an order, for paying them by hand (payouts are
 * not automated). Vendor Agreement § 6: a share of the value of the goods
 * delivered. For a bundle that is its price; for a subscription cycle, the
 * share of the price the box as ordered accounts for (its fill). Points come
 * out of Luvngift's share, so the price is taken BEFORE points.
 */
export function VendorPayBasis({
  order,
  fmt,
}: {
  order: { total: number; currency: string; pointsDiscount?: number; boxFillPercent?: number | null; subscriptionId?: string | null };
  fmt: (cents: number, currency: string) => string;
}) {
  const { data: rules } = useSubscriptionRules();
  if (!rules) return null;
  const price = order.total + (order.pointsDiscount ?? 0);
  const fill = order.subscriptionId ? order.boxFillPercent ?? null : 100;
  if (fill === null) {
    return (
      <p className="mt-2 text-xs text-amber-800">
        Vendor pay: this cycle&apos;s box fill was not recorded (box held or from before fills were kept). Work it out from the box.
      </p>
    );
  }
  const basis = Math.floor((price * fill) / 100);
  const pay = Math.floor((basis * rules.vendorSharePercent) / 100);
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Vendor pay: <span className="font-medium text-foreground">{fmt(pay, order.currency)}</span> ({rules.vendorSharePercent}% of{' '}
      {fmt(price, order.currency)}
      {order.subscriptionId ? ` × ${fill}% box fill` : ''}). Vendors approved before the § 6 update move to this on the date in
      their notice; until then they are paid on the full price.
    </p>
  );
}

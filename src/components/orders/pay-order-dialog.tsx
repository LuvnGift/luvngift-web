'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCreatePaymentIntent, useVerifyPayment } from '@/hooks/use-checkout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const currencySymbols: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };

export interface PayableOrder {
  id: string;
  recipientName: string;
  deliveryCity: string;
  deliveryState: string;
  currency: string;
  total: number;
}

/**
 * Pays for an existing, unpaid order: an abandoned bundle checkout, or a custom
 * gift whose quote the customer has accepted.
 *
 * Shared by the order list and the order page. It lived inline in the list,
 * which gated it on `bundleId` — so a custom order could be quoted but never
 * paid, from anywhere.
 */
export function PayOrderDialog({
  order,
  onClose,
  onPaid,
}: {
  order: PayableOrder | null;
  onClose: () => void;
  onPaid: (orderId: string) => void;
}) {
  const { mutateAsync: createPaymentIntent } = useCreatePaymentIntent();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    setClientSecret(null);
    if (!order) return;
    let cancelled = false;
    const start = async () => {
      try {
        const { clientSecret: secret } = await createPaymentIntent({ orderId: order.id });
        if (!cancelled) setClientSecret(secret);
      } catch {
        // The hook reports the error; closing returns the customer to the page.
        if (!cancelled) onClose();
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the order changes
  }, [order?.id]);

  if (!order) return null;
  const symbol = currencySymbols[order.currency] ?? order.currency;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete your payment</DialogTitle>
          <DialogDescription>Finish paying for your gift to {order.recipientName}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm border rounded-lg p-4 bg-muted/30">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order</span>
            <span className="font-mono text-xs">#{order.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recipient</span>
            <span>{order.recipientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivering to</span>
            <span>{order.deliveryCity}, {order.deliveryState}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total due</span>
            <span>{symbol}{(order.total / 100).toFixed(2)}</span>
          </div>
        </div>

        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <PaymentForm orderId={order.id} onBack={onClose} onSuccess={() => onPaid(order.id)} />
          </Elements>
        ) : (
          <div className="flex justify-center py-8"><Spinner /></div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({ orderId, onBack, onSuccess }: { orderId: string; onBack: () => void; onSuccess: () => void }) {
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

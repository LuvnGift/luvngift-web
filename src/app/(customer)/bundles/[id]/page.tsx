'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, Check, ShoppingBag, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useBundle } from '@/hooks/use-bundles';
import { useCreateOrder } from '@/hooks/use-orders';
import { useCreatePaymentIntent } from '@/hooks/use-checkout';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Order } from '@celebrate4me/shared';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const currencySymbols: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£' };

const countryCurrencyDefault: Record<string, 'CAD' | 'USD' | 'GBP'> = {
  CA: 'CAD', US: 'USD', GB: 'GBP',
};

const PROVINCE_TAX_LABEL: Record<string, string> = {
  AB: 'GST (5%)', BC: 'GST + PST (12%)', MB: 'GST + PST (12%)',
  NB: 'HST (15%)', NL: 'HST (15%)', NS: 'HST (15%)',
  NT: 'GST (5%)', NU: 'GST (5%)', ON: 'HST (13%)',
  PE: 'HST (15%)', QC: 'GST + QST (14.975%)', SK: 'GST + PST (11%)',
  YT: 'GST (5%)',
};

const PROVINCE_NAMES: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
};

const recipientSchema = z.object({
  recipientName: z.string().min(2, 'Name is required'),
  recipientPhone: z.string().min(7, 'Valid phone required'),
  street: z.string().min(5, 'Street is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  personalMessage: z.string().max(500).optional(),
  currency: z.enum(['CAD', 'USD', 'GBP']),
});

type RecipientForm = z.infer<typeof recipientSchema>;

interface Props {
  params: Promise<{ id: string }>;
}

export default function BundleDetailPage({ params }: Props) {
  const { id: slug } = use(params);
  const { data: bundle, isLoading, isError } = useBundle(slug);
  const { user } = useAuthStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'recipient' | 'payment'>('recipient');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const { mutateAsync: createOrder, isPending: creatingOrder } = useCreateOrder();
  const { mutateAsync: createPaymentIntent, isPending: creatingIntent } = useCreatePaymentIntent();

  const defaultCurrency: 'CAD' | 'USD' | 'GBP' =
    (user?.buyerCountry ? countryCurrencyDefault[user.buyerCountry] : undefined) ??
    (user?.preferredCurrency as 'CAD' | 'USD' | 'GBP' | undefined) ??
    'USD';

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RecipientForm>({
    resolver: zodResolver(recipientSchema),
    defaultValues: { currency: defaultCurrency },
  });

  if (isLoading) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;
  }

  if (isError || !bundle) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Bundle not found.</p>
        <Button variant="outline" asChild>
          <Link href="/occasions"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>
      </div>
    );
  }

  const handleRecipientSubmit = async (data: RecipientForm) => {
    try {
      const createdOrder = await createOrder({
        bundleId: bundle.id,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        deliveryAddress: { street: data.street, city: data.city, state: data.state, country: 'Nigeria' },
        personalMessage: data.personalMessage,
        currency: data.currency,
      });
      const intent = await createPaymentIntent({ orderId: createdOrder.id });
      setOrder(createdOrder);
      setClientSecret(intent.clientSecret);
      setCheckoutStep('payment');
    } catch {
      // errors handled in hooks
    }
  };

  const buyerCountry = user?.buyerCountry;
  const buyerProvince = user?.buyerProvince;
  const taxNote = (() => {
    if (!buyerCountry) return null;
    if (buyerCountry === 'CA') {
      const provinceName = buyerProvince ? PROVINCE_NAMES[buyerProvince] ?? buyerProvince : null;
      const taxLabel = buyerProvince ? PROVINCE_TAX_LABEL[buyerProvince] ?? 'GST (5%)' : 'GST (5%)';
      return provinceName
        ? `${taxLabel} will be applied — ${provinceName} billing address`
        : 'Canadian tax will be applied based on your billing address';
    }
    return 'No tax will be applied to your order';
  })();

  const price = (bundle.price / 100).toFixed(2);
  const symbol = currencySymbols[bundle.currency] ?? bundle.currency;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <Link
        href="/occasions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            {bundle.images?.[0] ? (
              <Image src={bundle.images[0]} alt={bundle.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl">🎁</div>
            )}
          </div>
          {bundle.images?.slice(1, 3).length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {bundle.images.slice(1, 3).map((img, i) => (
                <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <Image src={img} alt={`${bundle.name} ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold mb-2">{bundle.name}</h1>
            <p className="text-muted-foreground">{bundle.description}</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Estimated delivery: {bundle.estimatedDeliveryDays} business days</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">What's included</h3>
            <ul className="space-y-1">
              {bundle.items?.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}</span>
                  {item.description && (
                    <span className="text-muted-foreground">— {item.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-5">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-3xl font-bold">{symbol}{price}</span>
              <Badge variant="secondary">{bundle.currency}</Badge>
            </div>
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => { setCheckoutOpen(true); setCheckoutStep('recipient'); setOrder(null); }}
            >
              <ShoppingBag className="h-4 w-4" />
              Send this bundle
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent
          className={`max-h-[90vh] overflow-y-auto transition-all ${
            checkoutStep === 'payment' ? 'max-w-2xl' : 'max-w-lg'
          }`}
        >
          <DialogHeader>
            <DialogTitle>
              {checkoutStep === 'recipient' ? 'Recipient details' : 'Review & pay'}
            </DialogTitle>
            <DialogDescription>
              {checkoutStep === 'recipient'
                ? 'Tell us where to deliver the gift in Nigeria.'
                : 'Confirm your order details and enter your payment information.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1 — Recipient details */}
          {checkoutStep === 'recipient' && (
            <form onSubmit={handleSubmit(handleRecipientSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="recipientName">Recipient name</Label>
                  <Input id="recipientName" {...register('recipientName')} placeholder="Full name" />
                  {errors.recipientName && <p className="text-destructive text-xs">{errors.recipientName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recipientPhone">Recipient phone</Label>
                  <Input id="recipientPhone" {...register('recipientPhone')} placeholder="+234..." />
                  {errors.recipientPhone && <p className="text-destructive text-xs">{errors.recipientPhone.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="street">
                  Delivery street address <span className="text-muted-foreground text-xs">(Nigeria)</span>
                </Label>
                <Input id="street" {...register('street')} placeholder="House number, street name" />
                {errors.street && <p className="text-destructive text-xs">{errors.street.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} placeholder="Lagos" />
                  {errors.city && <p className="text-destructive text-xs">{errors.city.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...register('state')} placeholder="Lagos State" />
                  {errors.state && <p className="text-destructive text-xs">{errors.state.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">Pay in</Label>
                <Select
                  defaultValue={defaultCurrency}
                  onValueChange={(v) => setValue('currency', v as 'CAD' | 'USD' | 'GBP')}
                >
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {taxNote && (
                <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{taxNote}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="personalMessage">
                  Personal message <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="personalMessage"
                  {...register('personalMessage')}
                  placeholder="A warm message for the recipient..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={creatingOrder || creatingIntent}>
                {(creatingOrder || creatingIntent) ? (
                  <><Spinner size="sm" className="mr-2" />Setting up payment...</>
                ) : 'Continue to payment'}
              </Button>
            </form>
          )}

          {/* Step 2 — Order summary + Stripe payment side by side */}
          {checkoutStep === 'payment' && clientSecret && order && (
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Left: Order summary */}
              <OrderSummary order={order} bundleName={bundle.name} />

              {/* Right: Stripe payment form */}
              <div>
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret, appearance: { theme: 'stripe' } }}
                >
                  <StripePaymentForm
                    orderId={order.id}
                    onBack={() => setCheckoutStep('recipient')}
                  />
                </Elements>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Order summary ────────────────────────────────────────────────────────────

function OrderSummary({ order, bundleName }: { order: Order; bundleName: string }) {
  const sym = currencySymbols[order.currency] ?? order.currency;
  const fmt = (cents: number) => `${sym}${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-4 text-sm">
      {/* Bundle name */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sending</p>
        <p className="font-semibold">{bundleName}</p>
      </div>

      <Separator />

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span className="text-muted-foreground">
                {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
              </span>
              <span>{fmt(item.price)}</span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Pricing */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{fmt(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Tax</span>
          <span>{order.tax > 0 ? fmt(order.tax) : <span className="text-xs">None</span>}</span>
        </div>
        <div className="flex justify-between font-semibold text-base pt-1">
          <span>Total due</span>
          <span>{fmt(order.total)}</span>
        </div>
      </div>

      <Separator />

      {/* Recipient */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Delivering to</p>
        <p className="font-medium">{order.recipientName}</p>
        <p className="text-muted-foreground">{order.deliveryCity}, {order.deliveryState}</p>
        <p className="text-muted-foreground">Nigeria</p>
      </div>

      {/* Personal message */}
      {order.personalMessage && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Message</p>
            <p className="italic text-muted-foreground">"{order.personalMessage}"</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stripe payment form ──────────────────────────────────────────────────────

function StripePaymentForm({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}?success=true`,
      },
    });

    if (error) {
      toast.error(error.message ?? 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ business: { name: 'CelebrateForMe' } }} />
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isProcessing} className="flex-1">
          Back
        </Button>
        <Button onClick={handlePay} disabled={isProcessing || !stripe} className="flex-1">
          {isProcessing ? <><Spinner size="sm" className="mr-2" />Processing...</> : 'Pay now'}
        </Button>
      </div>
    </div>
  );
}

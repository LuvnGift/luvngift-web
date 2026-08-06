'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Check, ArrowLeft, MapPin, PackageOpen, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth.store';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';
import {
  usePlans,
  useAddresses,
  useCreateAddress,
  useCatalogue,
  useCreateSubscription,
  DIETARY_FLAGS,
  type SubscriptionInterval,
  type SubscriptionPlan,
  type CatalogueItem,
  type SubstitutionPreference,
} from '@/hooks/use-subscriptions';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const SUBSTITUTION_OPTIONS: {
  value: SubstitutionPreference;
  label: string;
  body: string;
}[] = [
  {
    value: 'SMART',
    label: 'Smart Substitute (recommended)',
    body: 'We pick the closest equal-or-better replacement so your delivery still arrives on time. You never pay the difference.',
  },
  {
    value: 'ASK_FIRST',
    label: 'Ask me first',
    body: "We'll message you and wait 24 hours. If we don't hear back we substitute as above, so the delivery isn't missed.",
  },
  {
    value: 'NONE',
    label: 'Never substitute',
    body: "Unavailable items are left out and made good on your next delivery, or refunded.",
  },
];

const SYMBOLS: Record<string, string> = { CAD: 'CA$', USD: '$', GBP: '£', NGN: '₦' };
const fmt = (cents: number, currency: string) =>
  `${SYMBOLS[currency] ?? currency}${(cents / 100).toFixed(2)}`;

type Step = 'recipient' | 'box' | 'payment';

export function SubscribeFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const planSlug = params.get('plan');
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<Step>('recipient');
  const [addressId, setAddressId] = useState<string | null>(null);
  const [interval, setInterval] = useState<SubscriptionInterval>('MONTHLY');
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [preference, setPreference] = useState<SubstitutionPreference>('SMART');
  const [dietaryFlags, setDietaryFlags] = useState<string[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = usePlans();
  const plan = useMemo(
    () => plans?.find((p) => p.slug === planSlug) ?? plans?.[0],
    [plans, planSlug],
  );

  const { mutateAsync: createSubscription, isPending: subscribing } = useCreateSubscription();

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="font-medium">Please sign in to set up a subscription</p>
        <p className="text-sm text-muted-foreground mt-1">
          You&apos;ll need an account to manage deliveries and payment.
        </p>
        <Button asChild className="mt-4">
          <Link href={`/login?redirect=/subscriptions/new${planSlug ? `?plan=${planSlug}` : ''}`}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  }

  if (plansLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!plan) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">That plan isn&apos;t available.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/subscriptions">See all plans</Link>
        </Button>
      </div>
    );
  }

  const price = plan.prices.find((p) => p.interval === interval);
  const pickedCount = Object.keys(picked).length;

  const handleSubscribe = async () => {
    if (!addressId) return;
    const items = Object.entries(picked).map(([customItemId, quantity]) => ({
      customItemId,
      quantity,
    }));
    try {
      const result = await createSubscription({
        planId: plan.id,
        addressId,
        interval,
        items,
        substitutionPreference: preference,
        dietaryFlags,
        dietaryNotes: dietaryNotes.trim() || undefined,
      });
      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setStep('payment');
      } else {
        // No confirmation needed — already active.
        toast.success('Subscription active');
        router.push('/account');
      }
    } catch {
      // surfaced by the hook
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <StepIndicator step={step} />

        {step === 'recipient' && (
          <RecipientStep
            selectedId={addressId}
            onSelect={setAddressId}
            onNext={() => setStep('box')}
          />
        )}

        {step === 'box' && addressId && (
          <BoxStep
            plan={plan}
            addressId={addressId}
            picked={picked}
            setPicked={setPicked}
            preference={preference}
            setPreference={setPreference}
            dietaryFlags={dietaryFlags}
            setDietaryFlags={setDietaryFlags}
            dietaryNotes={dietaryNotes}
            setDietaryNotes={setDietaryNotes}
            onBack={() => setStep('recipient')}
            onNext={handleSubscribe}
            submitting={subscribing}
          />
        )}

        {step === 'payment' && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <PaymentStep onBack={() => setStep('box')} />
          </Elements>
        )}
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 h-fit rounded-xl border p-5 space-y-3 text-sm">
        <p className="font-semibold text-base">{plan.name}</p>
        <p className="text-muted-foreground">{plan.description}</p>
        <Separator />

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Frequency</p>
          <div className="grid grid-cols-2 gap-2">
            {(['MONTHLY', 'BIWEEKLY'] as const).map((opt) => {
              const available = plan.prices.some((p) => p.interval === opt);
              if (!available) return null;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={step === 'payment'}
                  onClick={() => setInterval(opt)}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                    interval === opt ? 'border-foreground bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  {opt === 'MONTHLY' ? 'Every month' : 'Every 2 weeks'}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Items chosen</span>
          <span className={pickedCount > plan.slotCount ? 'text-red-600 font-medium' : ''}>
            {pickedCount} / {plan.slotCount}
          </span>
        </div>
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>{price ? fmt(price.amount, price.currency) : '—'}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Charged {interval === 'MONTHLY' ? 'monthly' : 'every two weeks'} until you cancel.
        </p>
      </aside>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'recipient', label: 'Recipient' },
    { key: 'box', label: 'Build the box' },
    { key: 'payment', label: 'Payment' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <ol className="flex items-center gap-2 mb-6 text-sm">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              i < currentIndex
                ? 'bg-green-600 text-white'
                : i === currentIndex
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {i < currentIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={i === currentIndex ? 'font-medium' : 'text-muted-foreground'}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-muted-foreground mx-1">›</span>}
        </li>
      ))}
    </ol>
  );
}

// ─── Step 1: recipient ────────────────────────────────────────────────────────

function RecipientStep({
  selectedId,
  onSelect,
  onNext,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
}) {
  const { data: addresses, isLoading } = useAddresses();
  const { mutateAsync: createAddress, isPending } = useCreateAddress();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    recipientName: '',
    recipientPhone: '',
    street: '',
    city: '',
    state: '',
  });

  const showForm = adding || (!isLoading && (addresses?.length ?? 0) === 0);

  const handleAdd = async () => {
    if (!form.recipientName || !form.recipientPhone || !form.street || !form.city || !form.state) {
      toast.error('Please complete every field');
      return;
    }
    try {
      const created = await createAddress({ ...form, country: 'Nigeria' });
      onSelect(created.id);
      setAdding(false);
    } catch {
      // surfaced by the hook
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Who is this for?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          What we can source depends on where they live, so pick the address first.
        </p>
      </div>

      {addresses && addresses.length > 0 && (
        <ul className="space-y-2">
          {addresses.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedId === a.id ? 'border-foreground bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <p className="font-medium text-sm">{a.recipientName}</p>
                <p className="text-xs text-muted-foreground">
                  {a.street}, {a.city}, {a.state}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="font-medium text-sm">New recipient</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="recipientName">Full name</Label>
              <Input
                id="recipientName"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipientPhone">Phone</Label>
              <Input
                id="recipientPhone"
                placeholder="+234 801 234 5678"
                value={form.recipientPhone}
                onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="street">Street address</Label>
            <Input
              id="street"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              >
                <option value="">Select state…</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={isPending} size="sm">
              {isPending ? <><Spinner size="sm" className="mr-2" />Saving…</> : 'Save recipient'}
            </Button>
            {(addresses?.length ?? 0) > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          Add a different recipient
        </Button>
      )}

      <Button onClick={onNext} disabled={!selectedId} className="w-full sm:w-auto">
        Continue to the box
      </Button>
    </div>
  );
}

// ─── Step 2: box builder ──────────────────────────────────────────────────────

function BoxStep({
  plan,
  addressId,
  picked,
  setPicked,
  preference,
  setPreference,
  dietaryFlags,
  setDietaryFlags,
  dietaryNotes,
  setDietaryNotes,
  onBack,
  onNext,
  submitting,
}: {
  plan: SubscriptionPlan;
  addressId: string;
  picked: Record<string, number>;
  setPicked: (v: Record<string, number>) => void;
  preference: SubstitutionPreference;
  setPreference: (v: SubstitutionPreference) => void;
  dietaryFlags: string[];
  setDietaryFlags: (v: string[]) => void;
  dietaryNotes: string;
  setDietaryNotes: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const { data: items, isLoading } = useCatalogue(addressId);
  const count = Object.keys(picked).length;
  const full = count >= plan.slotCount;

  const toggle = (item: CatalogueItem) => {
    const next = { ...picked };
    if (next[item.id]) delete next[item.id];
    else if (!full) next[item.id] = 1;
    else toast.error(`This plan allows ${plan.slotCount} items. Remove one first.`);
    setPicked(next);
  };

  const setQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setPicked({ ...picked, [id]: Math.min(qty, 20) });
  };

  const grouped = useMemo(() => {
    const map: Record<string, CatalogueItem[]> = {};
    for (const item of items ?? []) (map[item.category] ??= []).push(item);
    return map;
  }, [items]);

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <PackageOpen className="h-4 w-4" /> Build the box
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose up to <strong>{plan.slotCount}</strong> items. Quantity doesn&apos;t use extra
          slots — pick 5 bags of rice if you like. Leave it empty to get our pre-picked box.
        </p>
      </div>

      {(items?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          We don&apos;t have items listed for this area yet. You can still subscribe and
          we&apos;ll send our standard box.
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{category}</p>
            <ul className="grid sm:grid-cols-2 gap-2">
              {catItems.map((item) => {
                const chosen = Boolean(picked[item.id]);
                return (
                  <li key={item.id}>
                    <div
                      className={`rounded-lg border p-3 transition-colors ${
                        chosen ? 'border-foreground bg-muted' : 'hover:bg-muted/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(item)}
                        className="w-full text-left"
                        aria-pressed={chosen}
                      >
                        <p className="font-medium text-sm flex items-center gap-2">
                          {chosen && <Check className="h-3.5 w-3.5 text-green-600" />}
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                      </button>

                      {chosen && (
                        <div className="flex items-center gap-2 mt-2">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={picked[item.id]}
                            onChange={(e) => setQty(item.id, Number(e.target.value))}
                            className="h-7 w-16 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      {/* Dietary constraints — safety, so this sits above the preference picker. */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-sm">Allergies & dietary requirements</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              We never substitute across these lines, in either direction. If we can&apos;t find
              something safe, we leave it out rather than risk it.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {DIETARY_FLAGS.map((flag) => (
            <label key={flag} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={dietaryFlags.includes(flag)}
                onChange={() =>
                  setDietaryFlags(
                    dietaryFlags.includes(flag)
                      ? dietaryFlags.filter((f) => f !== flag)
                      : [...dietaryFlags, flag],
                  )
                }
                className="h-3.5 w-3.5"
              />
              {flag}
            </label>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dietaryNotes" className="text-xs">
            Anything else we should know? <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="dietaryNotes"
            value={dietaryNotes}
            onChange={(e) => setDietaryNotes(e.target.value)}
            placeholder="e.g. severe reaction to shellfish — please avoid entirely"
          />
        </div>
      </div>

      {/* Substitution preference */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="font-medium text-sm">
          If something isn&apos;t available{' '}
          <a
            href="/substitution-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-normal text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            read our promise
          </a>
        </p>
        {SUBSTITUTION_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors ${
              preference === opt.value ? 'border-foreground bg-muted' : 'hover:bg-muted/40'
            }`}
          >
            <input
              type="radio"
              name="substitutionPreference"
              checked={preference === opt.value}
              onChange={() => setPreference(opt.value)}
              className="mt-0.5 h-3.5 w-3.5"
            />
            <span className="text-sm">
              <span className="font-medium">{opt.label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{opt.body}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={onNext} disabled={submitting} className="flex-1">
          {submitting ? <><Spinner size="sm" className="mr-2" />Setting up…</> : 'Continue to payment'}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: payment ──────────────────────────────────────────────────────────

function PaymentStep({ onBack }: { onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/account?subscribed=true` },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
    } else {
      toast.success('Subscription active — your first delivery is being prepared');
      router.push('/account?subscribed=true');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Payment</h2>
      <PaymentElement options={{ business: { name: 'Luvngift' } }} />
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={processing}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={handlePay} disabled={processing || !stripe} className="flex-1">
          {processing ? <><Spinner size="sm" className="mr-2" />Processing…</> : 'Start subscription'}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Your card is charged now and then each cycle until you cancel. By subscribing you agree to
        our{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Terms
        </a>{' '}
        and{' '}
        <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Refund Policy
        </a>
        .
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customOrderSchema, CustomOrderInput } from '@celebrate4me/shared';
import { useCreateCustomOrder } from '@/hooks/use-orders';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, Gift, Sparkles, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';


const STEPS = [
  { id: 1, title: 'Occasion', icon: Sparkles },
  { id: 2, title: 'Recipient', icon: User },
  { id: 3, title: 'Gift details', icon: Gift },
  { id: 4, title: 'Review', icon: FileText },
];

const OCCASIONS = [
  'Birthday', 'Christmas', 'Easter', "Valentine's Day", 'Eid', "Mother's Day",
  "Father's Day", 'Wedding', 'Baby Shower', 'Graduation', 'Anniversary', 'Other',
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const countryCurrencyDefault: Record<string, 'CAD' | 'USD' | 'GBP'> = {
  CA: 'CAD', US: 'USD', GB: 'GBP',
};

export default function CustomGiftPage() {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const { mutateAsync: submitCustomOrder, isPending } = useCreateCustomOrder();
  const { user } = useAuthStore();

  const defaultCurrency: 'CAD' | 'USD' | 'GBP' =
    (user?.buyerCountry ? countryCurrencyDefault[user.buyerCountry] : undefined) ??
    (user?.preferredCurrency as 'CAD' | 'USD' | 'GBP' | undefined) ??
    'USD';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CustomOrderInput>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: { currency: defaultCurrency, giftType: 'PHYSICAL' },
  });

  const watched = watch();

  const validateStep = async () => {
    const fieldsByStep: Record<number, (keyof CustomOrderInput)[]> = {
      1: ['occasionType', 'preferredDate'],
      2: ['recipientName', 'recipientPhone', 'deliveryCity', 'deliveryState'],
      3: ['giftType', 'description', 'currency'],
      4: [],
    };
    return trigger(fieldsByStep[step]);
  };

  const nextStep = async () => {
    const valid = await validateStep();
    if (valid) setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: CustomOrderInput) => {
    try {
      await submitCustomOrder(data);
      setIsSubmitted(true);
      toast.success('Custom gift request submitted!');
    } catch {
      // error handled in hook
    }
  };

  if (isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <div className="text-6xl mb-6">🎁</div>
        <h1 className="text-2xl font-bold mb-3">Request received!</h1>
        <p className="text-muted-foreground mb-8">
          Our team will review your custom gift request and reach out within 24 hours with a quote
          and confirmation.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push('/orders')}>View my orders</Button>
          <Button variant="outline" onClick={() => router.push('/occasions')}>
            Browse occasions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Build a custom gift</h1>
        <p className="text-muted-foreground">
          Tell us what you have in mind and we'll make it happen in Nigeria.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isCompleted = step > s.id;
          const isCurrent = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                        ? 'border-primary text-primary'
                        : 'border-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn('text-xs hidden sm:block', isCurrent ? 'text-primary font-medium' : 'text-muted-foreground')}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px flex-1 mx-2 mt-[-16px]', step > s.id ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          {/* Step 1: Occasion */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>What's the occasion?</CardTitle>
                <CardDescription>Help us match the gift to the moment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label>Occasion type</Label>
                  <Select
                    value={watched.occasionType}
                    onValueChange={(v) => setValue('occasionType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an occasion" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCASIONS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.occasionType && (
                    <p className="text-destructive text-xs">{errors.occasionType.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="preferredDate">Preferred delivery date (optional)</Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const iso = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                      setValue('preferredDate', iso);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll do our best to deliver by this date.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Recipient */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Who's receiving the gift?</CardTitle>
                <CardDescription>We'll deliver directly to them in Nigeria.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="recipientName">Recipient full name</Label>
                    <Input
                      id="recipientName"
                      {...register('recipientName')}
                      placeholder="Full name"
                    />
                    {errors.recipientName && (
                      <p className="text-destructive text-xs">{errors.recipientName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recipientPhone">Recipient phone</Label>
                    <Input
                      id="recipientPhone"
                      {...register('recipientPhone')}
                      placeholder="+234 801 000 0000"
                    />
                    {errors.recipientPhone && (
                      <p className="text-destructive text-xs">{errors.recipientPhone.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Delivery state</Label>
                  <Select
                    value={watched.deliveryState}
                    onValueChange={(v) => setValue('deliveryState', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {NIGERIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.deliveryState && (
                    <p className="text-destructive text-xs">{errors.deliveryState.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deliveryCity">City / Area</Label>
                  <Input
                    id="deliveryCity"
                    {...register('deliveryCity')}
                    placeholder="e.g. Victoria Island"
                  />
                  {errors.deliveryCity && (
                    <p className="text-destructive text-xs">{errors.deliveryCity.message}</p>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Gift details */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Describe the gift</CardTitle>
                <CardDescription>The more detail you give, the better we can curate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Gift type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['PHYSICAL', 'EXPERIENCE'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setValue('giftType', type)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-sm font-medium transition-colors',
                          watched.giftType === type
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-muted-foreground',
                        )}
                      >
                        <span className="text-2xl">{type === 'PHYSICAL' ? '📦' : '✨'}</span>
                        <span>{type === 'PHYSICAL' ? 'Physical gift' : 'Experience'}</span>
                        <span className="text-xs text-muted-foreground font-normal text-center">
                          {type === 'PHYSICAL'
                            ? 'Food, clothing, gadgets, etc.'
                            : 'Spa, dinner, event tickets, etc.'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Describe what you want</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="e.g. A food hamper with dry foods, cooking oil, and juice, plus a birthday cake. The recipient is a family of 5..."
                    rows={4}
                  />
                  {errors.description && (
                    <p className="text-destructive text-xs">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Min. 10 characters. Be as specific as possible.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="estimatedBudget">Estimated budget (optional)</Label>
                    <Input
                      id="estimatedBudget"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="e.g. 150"
                      onChange={(e) => setValue('estimatedBudget', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Select
                      value={watched.currency}
                      onValueChange={(v) => setValue('currency', v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD — US Dollar</SelectItem>
                        <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                        <SelectItem value="GBP">GBP — British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="personalMessage">Personal message (optional)</Label>
                  <Textarea
                    id="personalMessage"
                    {...register('personalMessage')}
                    placeholder="A message to include with the gift..."
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="specialInstructions">Special instructions (optional)</Label>
                  <Textarea
                    id="specialInstructions"
                    {...register('specialInstructions')}
                    placeholder="Any allergies, preferences, or packaging instructions..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle>Review your request</CardTitle>
                <CardDescription>
                  Our team will contact you within 24 hours with a quote.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Occasion</span>
                    <span className="font-medium">{watched.occasionType}</span>
                  </div>
                  {watched.preferredDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Preferred date</span>
                      <span className="font-medium">
                        {new Date(watched.preferredDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="font-medium">{watched.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{watched.recipientPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{watched.deliveryCity}, {watched.deliveryState}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Gift type</span>
                    <Badge variant="secondary">
                      {watched.giftType === 'PHYSICAL' ? '📦 Physical gift' : '✨ Experience'}
                    </Badge>
                  </div>
                  {watched.estimatedBudget && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">{watched.estimatedBudget} {watched.currency}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Description</span>
                    <p className="mt-1 text-foreground">{watched.description}</p>
                  </div>
                  {watched.personalMessage && (
                    <div>
                      <span className="text-muted-foreground">Personal message</span>
                      <p className="mt-1 italic">"{watched.personalMessage}"</p>
                    </div>
                  )}
                </div>

                <div className="bg-muted rounded-md p-3 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">No payment yet.</strong> We'll review your request,
                    curate the perfect gift, and send you a quote. You only pay when you approve it.
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={prevStep}>
              Back
            </Button>
          ) : <div />}

          {step < 4 ? (
            <Button type="button" onClick={nextStep}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Submitting...' : 'Submit request'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

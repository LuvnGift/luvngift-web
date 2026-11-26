'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { useSetLocation } from '@/hooks/use-user';
import {
  updateProfileSchema, UpdateProfileInput,
  updateLocationSchema, UpdateLocationInput,
} from '@luvngift/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SavedCardsCard } from './saved-cards-card';
import Link from 'next/link';
import { DeleteAccountCard } from './delete-account-card';
import { ChangePasswordCard } from '@/components/account/change-password-card';
import { TwoFactorCard } from '@/components/account/two-factor-card';
import { MarketingPreferenceCard } from '@/components/marketing/marketing-preference-card';
import { latestAdultDateOfBirth } from '@luvngift/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { MapPin, Repeat, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountPage() {
  const { data: user, isLoading } = useMe();
  const { setUser } = useAuthStore();
  const { mutate: setLocation, isPending: locationPending } = useSetLocation();
  const profileForm = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema) });
  const locationForm = useForm<UpdateLocationInput>({ resolver: zodResolver(updateLocationSchema) });
  const selectedCountry = locationForm.watch('buyerCountry');

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        username: user.username,
        phone: user.phone ?? '',
      });
      if (user.buyerCountry) {
        locationForm.reset({
          buyerCountry: user.buyerCountry as 'CA' | 'US' | 'GB',
          buyerProvince: user.buyerProvince ?? undefined,
          billingStreet: (user as any).billingStreet ?? undefined,
          billingCity: (user as any).billingCity ?? undefined,
          billingPostalCode: (user as any).billingPostalCode ?? undefined,
        });
      }
    }
  }, [user]);

  const onProfileSubmit = async (data: UpdateProfileInput) => {
    try {
      const res = await api.patch('/api/v1/users/me', data);
      if (user) {
        setUser({ ...user, ...res.data.data });
      }
      toast.success('Profile updated.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to update profile.');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;
  }

  const initials = (user?.firstName?.charAt(0) ?? user?.username?.charAt(0) ?? '?').toUpperCase();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username;

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Account settings</h1>

      <div className="space-y-6">
        {/* Profile section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{fullName}</CardTitle>
                <CardDescription>
                  @{user?.username} · {user?.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...profileForm.register('firstName')} placeholder="Jane" autoComplete="given-name" />
                  {profileForm.formState.errors.firstName && (
                    <p className="text-destructive text-xs">{profileForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...profileForm.register('lastName')} placeholder="Doe" autoComplete="family-name" />
                  {profileForm.formState.errors.lastName && (
                    <p className="text-destructive text-xs">{profileForm.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...profileForm.register('username')} />
                {profileForm.formState.errors.username && (
                  <p className="text-destructive text-xs">
                    {profileForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ''} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="phone" {...profileForm.register('phone')} type="tel" placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input id="dateOfBirth" {...profileForm.register('dateOfBirth')} type="date" max={latestAdultDateOfBirth()} />
                <p className="text-xs text-muted-foreground">Used only to confirm you are 18 or older.</p>
              </div>
              <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? 'Saving...' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Billing address section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <CardTitle>Billing address</CardTitle>
            </div>
            <CardDescription>
              Your home address — used to calculate taxes on your orders. Only Canadian buyers are charged tax.
              {!(user as any)?.billingStreet && (
                <span className="block mt-1 text-destructive font-medium">
                  Billing address required before you can place orders.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={locationForm.handleSubmit((d) => setLocation(d))} className="space-y-4">
              {/* Country */}
              <div className="space-y-1.5">
                <Label htmlFor="buyerCountry">Country</Label>
                <select
                  id="buyerCountry"
                  {...locationForm.register('buyerCountry')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select country…</option>
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                </select>
                {locationForm.formState.errors.buyerCountry && (
                  <p className="text-destructive text-xs">{locationForm.formState.errors.buyerCountry.message}</p>
                )}
              </div>

              {/* Street */}
              <div className="space-y-1.5">
                <Label htmlFor="billingStreet">Street address</Label>
                <Input id="billingStreet" {...locationForm.register('billingStreet')} placeholder="123 Main St" />
                {locationForm.formState.errors.billingStreet && (
                  <p className="text-destructive text-xs">{locationForm.formState.errors.billingStreet.message}</p>
                )}
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label htmlFor="billingCity">City</Label>
                <Input id="billingCity" {...locationForm.register('billingCity')} placeholder="Toronto" />
                {locationForm.formState.errors.billingCity && (
                  <p className="text-destructive text-xs">{locationForm.formState.errors.billingCity.message}</p>
                )}
              </div>

              {/* Province (CA) */}
              {selectedCountry === 'CA' && (
                <div className="space-y-1.5">
                  <Label htmlFor="buyerProvince">Province / Territory</Label>
                  <select
                    id="buyerProvince"
                    {...locationForm.register('buyerProvince')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select province…</option>
                    {[
                      ['AB','Alberta'],['BC','British Columbia'],['MB','Manitoba'],
                      ['NB','New Brunswick'],['NL','Newfoundland and Labrador'],['NS','Nova Scotia'],
                      ['NT','Northwest Territories'],['NU','Nunavut'],['ON','Ontario'],
                      ['PE','Prince Edward Island'],['QC','Quebec'],['SK','Saskatchewan'],['YT','Yukon'],
                    ].map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                  {locationForm.formState.errors.buyerProvince && (
                    <p className="text-destructive text-xs">{locationForm.formState.errors.buyerProvince.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Your gift is delivered in Nigeria, so no Canadian sales tax is added.</p>
                </div>
              )}

              {/* State for US */}
              {selectedCountry === 'US' && (
                <div className="space-y-1.5">
                  <Label htmlFor="buyerProvince">State <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="buyerProvince" {...locationForm.register('buyerProvince')} placeholder="NY" maxLength={2} />
                </div>
              )}

              {/* Postal code */}
              <div className="space-y-1.5">
                <Label htmlFor="billingPostalCode">Postal / ZIP code <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="billingPostalCode"
                  {...locationForm.register('billingPostalCode')}
                  placeholder={selectedCountry === 'US' ? '10001' : selectedCountry === 'GB' ? 'SW1A 1AA' : 'A1B 2C3'}
                />
              </div>

              <Button type="submit" disabled={locationPending}>
                {locationPending ? 'Saving…' : 'Save address'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <MarketingPreferenceCard />

        {/* Recurring gifts have their own page (/account/subscriptions). */}
        <Link href="/account/subscriptions" className="block">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <div>
                  <CardTitle>My subscriptions</CardTitle>
                  <CardDescription>Your recurring gifts: box, deliveries, skip, pause or cancel.</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>

        {/* Saved cards */}
        <SavedCardsCard />

        <ChangePasswordCard />

        <TwoFactorCard enabled={Boolean(user?.twoFactorEnabled)} />

        <DeleteAccountCard
          hasPassword={(user as { hasPassword?: boolean } | undefined)?.hasPassword !== false}
          twoFactorEnabled={Boolean(user?.twoFactorEnabled)}
        />

      </div>
    </div>
  );
}

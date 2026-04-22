'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMe } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { useSetLocation } from '@/hooks/use-user';
import {
  updateProfileSchema, UpdateProfileInput,
  updateLocationSchema, UpdateLocationInput,
  changePasswordSchema,
} from '@luvngift/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { MapPin } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const passwordSchema = changePasswordSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const { data: user, isLoading } = useMe();
  const { setUser } = useAuthStore();
  const [twoFADialog, setTwoFADialog] = useState<'setup' | 'disable' | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpToken, setTotpToken] = useState('');

  const { mutate: setLocation, isPending: locationPending } = useSetLocation();
  const profileForm = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
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

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await api.post('/api/v1/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed.');
      passwordForm.reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Failed to change password.');
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
                  {user?.dateOfBirth && (
                    <span className="block text-xs mt-0.5">
                      Born {new Date(user.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
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
                <Label htmlFor="dateOfBirth">Date of Birth <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="dateOfBirth" {...profileForm.register('dateOfBirth')} type="date" />
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
                  <p className="text-xs text-muted-foreground">Canadian orders are subject to GST/HST/PST based on your province.</p>
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

        {/* Password section */}
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  {...passwordForm.register('currentPassword')}
                  type="password"
                  autoComplete="current-password"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-destructive text-xs">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  {...passwordForm.register('newPassword')}
                  type="password"
                  autoComplete="new-password"
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-destructive text-xs">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  {...passwordForm.register('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-destructive text-xs">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 2FA section */}
        <Card>
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>
              {user?.twoFactorEnabled
                ? '2FA is enabled on your account.'
                : 'Add an extra layer of security to your account.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.twoFactorEnabled ? (
              <Button
                variant="destructive"
                onClick={() => { setTwoFADialog('disable'); setTotpToken(''); }}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  try {
                    const res = await api.post('/api/v1/auth/2fa/setup');
                    setQrCode(res.data.data.qrCode);
                    setTotpSecret(res.data.data.secret);
                    setTwoFADialog('setup');
                    setTotpToken('');
                  } catch {
                    toast.error('Failed to setup 2FA.');
                  }
                }}
              >
                Enable 2FA
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 2FA Setup Dialog */}
        <Dialog open={twoFADialog === 'setup'} onOpenChange={() => setTwoFADialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Set up 2FA</DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app, then enter the 6-digit code to verify.
              </DialogDescription>
            </DialogHeader>
            {qrCode && (
              <div className="flex flex-col items-center gap-2 py-2">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                {totpSecret && (
                  <div className="w-full space-y-1">
                    <p className="text-xs text-muted-foreground text-center">
                      Can&apos;t scan? Enter this code manually in your app:
                    </p>
                    <p className="text-xs font-mono bg-muted rounded px-3 py-2 text-center tracking-widest select-all break-all">
                      {totpSecret}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="setup-token">Verification code</Label>
                <Input
                  id="setup-token"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button
                className="w-full"
                disabled={totpToken.length !== 6}
                onClick={async () => {
                  try {
                    await api.post('/api/v1/auth/2fa/verify', { token: totpToken });
                    toast.success('2FA enabled successfully.');
                    setTwoFADialog(null);
                    window.location.reload();
                  } catch {
                    toast.error('Invalid code. Please try again.');
                  }
                }}
              >
                Verify & Enable
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2FA Disable Dialog */}
        <Dialog open={twoFADialog === 'disable'} onOpenChange={() => setTwoFADialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Disable 2FA</DialogTitle>
              <DialogDescription>
                Enter the 6-digit code from your authenticator app to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="disable-token">Verification code</Label>
                <Input
                  id="disable-token"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                disabled={totpToken.length !== 6}
                onClick={async () => {
                  try {
                    await api.post('/api/v1/auth/2fa/disable', { token: totpToken });
                    toast.success('2FA disabled.');
                    setTwoFADialog(null);
                    window.location.reload();
                  } catch {
                    toast.error('Invalid code. Please try again.');
                  }
                }}
              >
                Confirm Disable
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
